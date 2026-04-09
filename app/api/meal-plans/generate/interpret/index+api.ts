/**
 * POST /api/meal-plans/generate/interpret
 *
 * LLM Interpreter — Layer 1 of the meal plan generation pipeline.
 *
 * Uses Gemini function calling with two tools:
 *   - search_recipes(queries)  — look up real recipe IDs before emitting assign ops
 *   - output_operations(...)   — emit the final structured interpreter response
 *
 * The server runs a tool-call loop (max 5 rounds) until output_operations is
 * called. Recipe search is resolved entirely server-side; callers always receive
 * a single InterpreterFinalResponse with no follow-up required.
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { Content, Part } from "@google/genai";
import {
	InterpreterResponseSchema,
	type ResolvedRecipe,
	type InterpreterFinalResponse,
} from "@/lib/meal-plan-draft/interpreter-schema";
import { dayOfWeekFromDate } from "@/lib/meal-plan-draft";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";
import { supabase } from "@/config/supabase-server";
import { Spoonacular } from "@/lib/server/spoonacular/spoonacular-helper";
import { z } from "zod";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const MAX_TOOL_ROUNDS = 10;

// ==========================================
// Request validation
// ==========================================

const InterpreterRequestSchema = z.object({
	user_message: z.string().min(1),
	/**
	 * Optional profile id→name mapping so the LLM can resolve names mentioned
	 * in the user message (e.g. "1 serving for David") to profile UUIDs.
	 */
	profiles: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
	draft: z.object({
		session_id: z.string(),
		included_profile_ids: z.array(z.string()),
		slots: z.record(
			z.object({
				date: z.string(),
				meal_type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
				entries: z.array(
					z.object({
						draft_entry_id: z.string(),
						recipe: z.object({ id: z.string(), name: z.string() }),
						locked: z.boolean(),
					}),
				),
			}),
		),
		preference_patch_stack: z.array(z.record(z.string(), z.unknown())),
	}),
});

export type PostInterpretResponse = Awaited<ReturnType<typeof POST>>;

// ==========================================
// Function declarations
// ==========================================

const FUNCTION_DECLARATIONS = [
	{
		name: "search_recipes",
		description:
			"Search the user's recipe library by name. " +
			"Only call this when the recipe is NOT already present in the current draft SLOTS. " +
			"If the recipe is already in a slot, copy its recipe_id directly — no search needed. " +
			"Never invent or guess a recipe_id. " +
			"Provide alternate phrasings as separate queries to handle: " +
			'(1) hyphenation mismatches (e.g. "cottage cheese pancakes" AND "cottage-cheese pancakes"); ' +
			'(2) plural/singular forms (e.g. "enchiladas" AND "enchilada"); ' +
			'(3) common synonyms or keyword subsets (e.g. "skillet", "one-pan").',
		parameters: {
			type: Type.OBJECT,
			properties: {
				queries: {
					type: Type.ARRAY,
					items: { type: Type.STRING },
					description:
						"1–3 search queries ordered most-to-least specific. " +
						"Include alternate phrasings to maximise recall.",
				},
			},
			required: ["queries"],
		},
	},
	{
		name: "output_operations",
		description:
			"Emit the final interpreter response. " +
			"Call this when you have all the information needed to produce the operations list. " +
			"If a recipe assign was needed, call search_recipes first to obtain the recipe_id.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				operations_json: {
					type: Type.STRING,
					description:
						"JSON-serialised array of interpreter operations in execution order. " +
						"Must be valid JSON. Use [] for an empty list. " +
						"Each element MUST be one of exactly these three shapes:\n" +
						'  { "op": "pref_patch", "action": "add_filter"|"remove_filter"|"set_weight"|"remove_weight", "scope": null|{days?,meal_types?}, "payload": {filter?,weight?} }\n' +
						'  { "op": "plan_edit", "action": "swap"|"move"|"copy"|"clear"|"assign"|"add_slot"|"remove_slot"|"lock"|"unlock", "payload": {target?,to?,recipe_id?,recipe_name?,lock?,meal_type?,draft_entry_id?,profile_servings?} }\n' +
						'  { "op": "regenerate_slots", "target": [{date,meal_type}]|null }\n' +
						"op is REQUIRED on every element. action and payload are fields of the element itself — NOT nested objects.",
				},
				interpretation_summary: {
					type: Type.STRING,
					description:
						"A single past-tense sentence confirming what operations you emitted. " +
						"Do NOT describe future intent here — if you plan to unlock, clear, or regenerate, those operations MUST be in operations_json. " +
						'Example: "Unlocked and cleared Monday dinner, then triggered regeneration."',
				},
				is_ambiguous: {
					type: Type.BOOLEAN,
					description:
						"True if you made a reasonable assumption to resolve ambiguity in the request.",
				},
			},
			required: ["operations_json", "interpretation_summary", "is_ambiguous"],
		},
	},
];

// ==========================================
// System prompt
// ==========================================

const SYSTEM_PROMPT = `You are the LLM Interpreter for an AI-powered meal plan generation system.

YOUR ROLE:
You translate plain-language user requests into a precise, ordered list of structured operations that modify a meal plan draft. You do NOT generate recipes, fill slots, or make food choices — those are handled downstream by a deterministic generator.

You have two functions available:
  - search_recipes(queries)  — look up real recipe IDs from the user's library
  - output_operations(...)   — emit your final answer

Always call output_operations exactly once as your final action.

THE OPERATION TYPES (for the operations_json array):

Each operation is a JSON object. The top-level field "op" is ALWAYS required and determines the type.
Never nest the action name as a key — "op", "action", and "payload" are always flat sibling fields.

SHAPE REFERENCE:

  pref_patch:
    { "op": "pref_patch", "action": "add_filter", "scope": null, "payload": { "filter": { "type": "exclude_ingredient", "value": "kale" } } }
    { "op": "pref_patch", "action": "add_filter", "scope": null, "payload": { "filter": { "type": "exclude_recipe", "value": "<recipe-uuid>" } } }
    { "op": "pref_patch", "action": "set_weight",  "scope": { "days": ["monday"], "meal_types": ["Dinner"] }, "payload": { "weight": { "signal": "calorie_density", "value": 1.8 } } }
    { "op": "pref_patch", "action": "remove_weight", "scope": null, "payload": { "weight": { "signal": "novelty", "value": 1.0 } } }

  plan_edit:
    { "op": "plan_edit", "action": "assign", "payload": { "target": { "date": "2026-04-07", "meal_type": "Dinner" }, "recipe_id": "<uuid>", "recipe_name": "<name>", "lock": true } }
    { "op": "plan_edit", "action": "assign", "payload": { "target": { "date": "2026-04-07", "meal_type": "Dinner" }, "recipe_id": "<uuid>", "recipe_name": "<name>", "lock": true, "profile_servings": [{"profile_id": "<uuid>", "servings": 1}, {"profile_id": "<uuid>", "servings": 2}] } }
    { "op": "plan_edit", "action": "lock",   "payload": { "target": [{ "date": "2026-04-07", "meal_type": "Lunch" }] } }
    { "op": "plan_edit", "action": "unlock", "payload": { "target": "all" } }
    { "op": "plan_edit", "action": "clear",  "payload": { "target": { "date": "2026-04-07", "meal_type": "Breakfast" } } }
    { "op": "plan_edit", "action": "swap",   "payload": { "target": { "date": "2026-04-07", "meal_type": "Lunch" }, "to": { "date": "2026-04-08", "meal_type": "Lunch" } } }
    { "op": "plan_edit", "action": "copy",   "payload": { "target": { "date": "2026-04-07", "meal_type": "Breakfast" }, "to": [{ "date": "2026-04-08", "meal_type": "Breakfast" }] } }
    { "op": "plan_edit", "action": "add_slot",    "payload": { "meal_type": "Snack" } }
    { "op": "plan_edit", "action": "remove_slot", "payload": { "meal_type": "Snack" } }

  regenerate_slots:
    { "op": "regenerate_slots", "target": null }                                          ← all unlocked slots
    { "op": "regenerate_slots", "target": [{ "date": "2026-04-07", "meal_type": "Dinner" }] }

ACTION DESCRIPTIONS:

  pref_patch actions:
    add_filter    — add a hard constraint (exclude ingredient, exclude specific recipe by ID, dietary restriction, max prep time, cuisine allow-list)
    remove_filter — remove a previously added hard constraint
    set_weight    — adjust a scoring signal multiplier (>1.0 boosts, 0.0–1.0 penalises)
    remove_weight — reset a scoring signal to its default of 1.0
    scope rules: null = all slots | { days } = those days all meals | { meal_types } = those meals all days | { days, meal_types } = exact intersection

  plan_edit actions:
    swap        — exchange the recipes between two slots (target ↔ to)
    move        — move a recipe from target to to (clears origin)
    copy        — copy a recipe from target to to (keeps origin)
    clear       — empty a slot's entries without removing the slot
    assign      — place a specific recipe (by recipe_id) into a slot; set lock:true to immediately lock it; optionally set profile_servings to override per-profile serving counts
    add_slot    — add a new meal_type row to all days in the plan
    remove_slot — remove a meal_type row from the plan entirely
    lock        — mark entries as locked so the generator never replaces them
    unlock      — mark entries as unlocked so the generator can fill them

ORDERING RULES (CRITICAL):
Operations in the array are executed IN ORDER. Always respect this sequence:
  1. plan_edit (unlock/lock) → must come before regenerate_slots
  2. plan_edit (structural: swap/move/copy/clear/assign/add_slot/remove_slot) → must come before regenerate_slots
  3. pref_patch → should precede the regenerate_slots that uses those preferences
  4. regenerate_slots → always last in a sequence

COMMON PATTERNS (shown as actual operations_json arrays):

"No kale":
  [
    { "op": "pref_patch", "action": "add_filter", "scope": null, "payload": { "filter": { "type": "exclude_ingredient", "value": "kale" } } },
    { "op": "regenerate_slots", "target": null }
  ]

"Replace Monday dinner with something lighter":
  [
    { "op": "pref_patch", "action": "set_weight", "scope": { "days": ["monday"], "meal_types": ["Dinner"] }, "payload": { "weight": { "signal": "calorie_density", "value": 1.8 } } },
    { "op": "regenerate_slots", "target": [{ "date": "<monday ISO date>", "meal_type": "Dinner" }] }
  ]

"Keep all lunches, just redo dinners":
  [
    { "op": "plan_edit", "action": "lock", "payload": { "target": [<all lunch SlotTargets>] } },
    { "op": "regenerate_slots", "target": [<all dinner SlotTargets>] }
  ]

"Use my beef and broccoli on Monday dinner" (after search_recipes returned the id):
  [
    { "op": "plan_edit", "action": "assign", "payload": { "target": { "date": "<monday ISO date>", "meal_type": "Dinner" }, "recipe_id": "<resolved uuid>", "recipe_name": "Beef and Broccoli", "lock": true } }
  ]

"1 serving for David and 2 servings for Milena of beef and broccoli on Monday dinner" (after search_recipes returned the id):
  [
    { "op": "plan_edit", "action": "assign", "payload": { "target": { "date": "<monday ISO date>", "meal_type": "Dinner" }, "recipe_id": "<resolved uuid>", "recipe_name": "Beef and Broccoli", "lock": true, "profile_servings": [{"profile_id": "<David's profile_id>", "servings": 1}, {"profile_id": "<Milena's profile_id>", "servings": 2}] } }
  ]

"Milena should have 2 servings of enchiladas" / "always give Milena 2 servings of enchiladas" / "update the enchiladas to 2 servings for Milena":
  (The enchilada recipe appears in multiple slots. Emit one assign per slot containing it.)
  [
    { "op": "plan_edit", "action": "assign", "payload": { "target": { "date": "<slot1 date>", "meal_type": "<slot1 meal_type>" }, "recipe_id": "<enchilada recipe_id from draft>", "recipe_name": "<enchilada recipe name>", "lock": true, "profile_servings": [{"profile_id": "<Milena's profile_id>", "servings": 2}] } },
    { "op": "plan_edit", "action": "assign", "payload": { "target": { "date": "<slot2 date>", "meal_type": "<slot2 meal_type>" }, "recipe_id": "<enchilada recipe_id from draft>", "recipe_name": "<enchilada recipe name>", "lock": true, "profile_servings": [{"profile_id": "<Milena's profile_id>", "servings": 2}] } }
  ]
  Note: Only Milena's servings are in profile_servings — other profiles' existing servings are preserved automatically.
  Note: Recipes are matched flexibly: "enchiladas" matches "enchilada" (singular/plural) as a substring of the recipe name.

"Same breakfast every day" (monday already filled):
  [
    { "op": "plan_edit", "action": "copy", "payload": { "target": { "date": "<monday>", "meal_type": "Breakfast" }, "to": [<tue–sun Breakfast SlotTargets>] } },
    { "op": "plan_edit", "action": "lock", "payload": { "target": [<all Breakfast SlotTargets>] } }
  ]

"Start completely over":
  [
    { "op": "plan_edit", "action": "unlock", "payload": { "target": "all" } },
    { "op": "regenerate_slots", "target": null }
  ]

"Replace Monday dinner with something else" (entry is locked):
  [
    { "op": "plan_edit", "action": "unlock", "payload": { "target": [{ "date": "<monday ISO date>", "meal_type": "Dinner" }] } },
    { "op": "regenerate_slots", "target": [{ "date": "<monday ISO date>", "meal_type": "Dinner" }] }
  ]

"Replace Monday dinner with something else" (entry is unlocked):
  [
    { "op": "plan_edit", "action": "clear", "payload": { "target": { "date": "<monday ISO date>", "meal_type": "Dinner" } } },
    { "op": "regenerate_slots", "target": [{ "date": "<monday ISO date>", "meal_type": "Dinner" }] }
  ]

"Don't use the chili recipe" / "ban the chili recipe" (recipe is currently in the draft — no search needed):
  [
    { "op": "plan_edit", "action": "unlock", "payload": { "target": [<all SlotTargets currently containing the banned recipe>] } },
    { "op": "pref_patch", "action": "add_filter", "scope": null, "payload": { "filter": { "type": "exclude_recipe", "value": "<recipe_id from draft SLOTS — NOT the entry_id>" } } },
    { "op": "regenerate_slots", "target": [<all SlotTargets currently containing the banned recipe>] }
  ]
  Note: All slots containing the same recipe share the SAME recipe_id — emit exactly ONE exclude_recipe filter.
  Note: Omit the unlock op for any slot where the entry is already unlocked.
  Note: Omit regenerate_slots entirely if the recipe does not appear in any slot.

"Don't use the chili recipe for any of the dinners" (scoped ban — meal type only):
  [
    { "op": "plan_edit", "action": "unlock", "payload": { "target": [<Dinner SlotTargets currently containing the banned recipe>] } },
    { "op": "pref_patch", "action": "add_filter", "scope": { "meal_types": ["Dinner"] }, "payload": { "filter": { "type": "exclude_recipe", "value": "<recipe_id>" } } },
    { "op": "regenerate_slots", "target": [<Dinner SlotTargets currently containing the banned recipe>] }
  ]
  Note: scope is { meal_types: ["Dinner"] } — NOT null — because the user qualified the ban to dinners only.

"Let's get rid of High Protein Blueberry Muffins With Greek Yogurt" (recipe appears in saturday + sunday breakfast — scan every SLOT line to find it):
  [
    { "op": "pref_patch", "action": "add_filter", "scope": null, "payload": { "filter": { "type": "exclude_recipe", "value": "<recipe_id copied verbatim from the saturday breakfast slot>" } } },
    { "op": "regenerate_slots", "target": [{ "date": "<saturday ISO date>", "meal_type": "Breakfast" }, { "date": "<sunday ISO date>", "meal_type": "Breakfast" }] }
  ]
  Note: The recipe appears on SLOT lines — the model MUST scan all slot lines before concluding "not found".

"I'm not a fan of zoodles" (draft contains "High Protein Chicken Bolognese With Zoodles"):
  [
    { "op": "plan_edit", "action": "unlock", "payload": { "target": [<SlotTargets containing the zoodles recipe, if locked>] } },
    { "op": "pref_patch", "action": "add_filter", "scope": null, "payload": { "filter": { "type": "exclude_recipe", "value": "<recipe_id of the zoodles recipe>" } } },
    { "op": "regenerate_slots", "target": [<SlotTargets containing the zoodles recipe>] }
  ]
  (is_ambiguous: true — "zoodles" is a preparation style, not an ingredient, so only the specific recipe is banned; zucchini is NOT excluded globally since the user may enjoy it in other forms)

"Undo that":
  []   (undo is handled client-side; say so in interpretation_summary)

DECLARATIVE SERVING STATEMENTS:
  Users often state serving preferences as facts rather than direct commands:
    - "Milena should have 2 servings of X"
    - "Always give David 1 serving of X"
    - "I want Milena to get 2 servings of X"
    - "Update the X to 2 servings for Milena"
  These are ALL equivalent to an assign operation with profile_servings set for the named profile.
  Apply the update to EVERY slot in the draft that contains a recipe matching X (using flexible word/stem matching).
  Do NOT treat them as preference statements or emit empty operations.

RECIPE ASSIGNMENT RULES:
  - NEVER invent or guess a recipe_id. Every recipe_id in an assign payload MUST be a real UUID
    (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) copied verbatim from the draft SLOTS or returned
    by search_recipes. Placeholder strings such as "unknown", "N/A", "TBD", "search", or any
    non-UUID value are STRICTLY FORBIDDEN — they will be rejected. If you do not yet have the real
    UUID, call search_recipes BEFORE calling output_operations.
  - BEFORE calling search_recipes, scan the SLOTS section of the current draft context:
      • Each slot entry shows its recipe name with (recipe_id: <uuid>, entry_id: <uuid>).
      • Match flexibly: check if any significant word from the user's phrase appears as a
        case-insensitive substring in a recipe name. Also try singular/plural variants
        (e.g. "enchiladas" → also try "enchilada"; "tomatoes" → also try "tomato").
      • If any slot recipe name contains a matching word or stem, that recipe is a match —
        copy its recipe_id verbatim and emit the assign op immediately without calling search_recipes.
      • Only call search_recipes when no draft slot recipe name contains a matching word or stem.
  - When searching, pick the best match from results by name/description similarity.
  - If results are empty, call output_operations with empty operations and explain the recipe wasn't found.
  - Include both recipe_id and recipe_name in the assign payload.
  - If the user specifies explicit serving counts per person (e.g. "1 serving for David, 2 for Milena"):
      • Look up each person's profile_id in the PROFILES LOOKUP section of the draft context.
      • Include a profile_servings array in the assign payload with { profile_id, servings } entries.
      • Only include profiles explicitly mentioned; omit profiles the user did not specify.
      • If a name is not found in the PROFILES LOOKUP, note the ambiguity and set is_ambiguous: true.
  - If no explicit servings are stated, omit profile_servings entirely (the generator computes them from calorie targets).

RECIPE BAN RULES:
  - A ban blocks a specific recipe from being selected by the generator for the rest of the session.
  - The recipe's ID is available directly in the draft context — do NOT call search_recipes for a ban.
  - Each slot entry in the SLOTS section shows BOTH identifiers:
      recipe_id  — the stable recipe UUID. Use THIS for the exclude_recipe filter value.
      entry_id   — an ephemeral slot UUID only used to target a specific DraftFoodEntry. NEVER use this as an exclude_recipe value.
  - Find the recipe_id by name-matching the recipe the user mentioned, then copy that recipe_id verbatim.
  - A single recipe may appear in multiple slots, but all occurrences share the SAME recipe_id. Emit ONE exclude_recipe filter using that single recipe_id.
  - Use the exclude_recipe filter type with the recipe's UUID as the value.
  - After adding the ban filter, also regenerate any affected slots (slots that currently contain the banned recipe AND fall within the ban scope) so they are immediately replaced.
  - Unlock a slot first if its entry is locked before regenerating.
  - If the recipe is not found in the current draft, say so in interpretation_summary and emit [] — do not invent a recipe_id.

  CRITICAL — HOW TO DETERMINE IF A RECIPE IS IN THE DRAFT:
  Before concluding that a recipe is absent, you MUST read EVERY line in the SLOTS section sequentially
  and check whether the user's recipe name (or any significant word from it) appears as a case-insensitive
  substring of the recipe name on that line. A match anywhere in the SLOTS section means the recipe IS
  present in the draft. Only after scanning every slot line without finding any match may you conclude
  "recipe not found". Do NOT rely on memory or prior context — always re-read the SLOTS section.

  SCOPED VS GLOBAL BAN:
  - If the user scopes the ban to specific meal types (e.g. "not for dinners", "only for lunches") or specific days,
    set the scope on the exclude_recipe filter accordingly — do NOT default to scope: null.
  - scope: null = banned from ALL slots in the plan (use only when the user wants a full ban with no qualification).
  - scope: { meal_types: ["Dinner"] } = banned from dinner slots only.
  - scope: { days: ["monday", "tuesday"] } = banned on those days across all meal types.
  - scope: { days: [...], meal_types: [...] } = banned at the exact intersection.
  - Only regenerate slots that contain the recipe AND fall within the ban scope.

IMPLICIT RECIPE BAN — KEYWORD IN RECIPE NAME:
  When the user expresses dislike for a food, ingredient, or preparation style (e.g. "I don't like zoodles",
  "not a fan of quinoa", "I hate Brussels sprouts"), do the following BEFORE defaulting to a global ingredient filter:
    1. Scan every recipe name in the current draft SLOTS for the mentioned keyword (case-insensitive substring match).
    2. If one or more recipe names contain the keyword → treat it as a ban for each matched recipe.
       Emit one exclude_recipe filter per distinct recipe_id found (usually just one).
       Decide whether to ALSO emit an exclude_ingredient filter:
         - The keyword is an ingredient (e.g. "quinoa", "Brussels sprouts", "kale") → YES, add exclude_ingredient with that ingredient name.
         - The keyword is a preparation style or dish form (e.g. "zoodles", "spiralized", "purée") → NO, skip exclude_ingredient.
           The user may enjoy the underlying ingredient in other forms; only the specific recipe is removed.
    3. If NO recipe names in the draft contain the keyword → fall back to a global exclude_ingredient filter only
       (the ingredient likely appears in un-shown recipe details rather than the name).
  Set is_ambiguous: true when you apply rule 2 so the UI can confirm your interpretation.

WEIGHT SIGNAL GUIDE:
  protein_ratio: higher = rank high-protein recipes higher
  calorie_density: higher = rank lower-calorie recipes higher
  prep_time: higher = rank quicker recipes higher
  novelty: higher = penalise recently seen or repeated recipes more
  source_preference: higher = prefer recipes from the user's personal library
  ingredient_overlap: higher = prefer recipes that share ingredients with already-placed slots
  leftover: higher = prefer leftover candidates from earlier slots

AMBIGUITY HANDLING:
  - Make a reasonable assumption when the request is ambiguous.
  - Set is_ambiguous: true and explain your interpretation in interpretation_summary.
  - Always provide a non-empty interpretation_summary (one sentence, plain language).

EMPTY OPERATIONS RULE:
  operations_json: [] is ONLY correct when the request genuinely requires NO plan changes.
  Valid empty-operations cases: "undo" (handled client-side), request already satisfied, recipe not found.
  INVALID: describing unlock/clear/regenerate/assign in interpretation_summary but emitting [].
  If your interpretation_summary mentions any action, that action MUST appear in operations_json.

CURRENT DRAFT CONTEXT:
  You will receive the current draft state in the user turn. Use it to:
  - Identify exact slot dates and meal types to target
  - Reference locked/unlocked state when emitting lock/unlock operations
  - Understand which preference patches are already active

DAY NAME RESOLUTION (CRITICAL):
  When the user references day names ("monday", "this friday", "next tuesday", etc.):
  - The draft context contains a "DAY → DATE LOOKUP" table. Use it — do not compute or infer dates yourself.
  - Copy the exact date string from that table into your operations. Never invent or guess a date.
  - Use the "Today" line to anchor relative references like "this week" vs "next week".
  - If the referenced day does not appear in the lookup table, say so in interpretation_summary and emit no ops for that day.`;

// ==========================================
// Handler
// ==========================================

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await req.json();

		const validation = InterpreterRequestSchema.safeParse(body);
		if (!validation.success) {
			return jsonResponse(
				{
					error: "Invalid request body",
					details: validation.error.errors,
				},
				{ status: 400 },
			);
		}

		const { user_message, draft, profiles } = validation.data;

		// Pre-compute the set of dates that actually exist in this draft.
		// Used to reject operations that reference hallucinated dates.
		const validDraftDates = new Set(
			Object.values(draft.slots).map((s) => s.date),
		);

		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

		const userTurn = `${user_message}

--- CURRENT DRAFT STATE ---
${buildDraftContext(draft, profiles ?? [])}`;

		const contents: Content[] = [{ role: "user", parts: [{ text: userTurn }] }];

		// Track whether we have already sent a nudge for the current stall streak.
		// A second consecutive empty response means the model is stuck and more
		// nudging won't help — bail early rather than burning more token budget.
		let consecutiveEmptyRounds = 0;

		for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
			const response = await ai.models.generateContent({
				model: "gemini-2.5-flash-lite",
				contents,
				config: {
					systemInstruction: {
						role: "user",
						parts: [{ text: SYSTEM_PROMPT }],
					},
					tools: [
						{
							functionDeclarations:
								FUNCTION_DECLARATIONS as unknown as import("@google/genai").FunctionDeclaration[],
						},
					],
					// 32k gives the model enough budget to think AND output a full
					// operations array for complex multi-step requests without stalling.
					maxOutputTokens: 32_000,
					temperature: 0.2,
					thinkingConfig: {
						thinkingBudget: 512,
					},
				},
			});

			console.log(JSON.stringify(response, null, 2));

			const candidate = response.candidates?.[0];
			// Filter out thought parts — they are internal reasoning tokens and
			// must not be re-sent as conversation history (causes API errors).
			const parts = (candidate?.content?.parts ?? []).filter(
				(p) => !(p as { thought?: boolean }).thought,
			);

			// Only append the model turn when there is real content to append.
			// Appending empty turns pollutes the conversation history and causes
			// the model to stall further on subsequent rounds.
			if (parts.length > 0) {
				contents.push({ role: "model", parts });
			}

			const functionCallParts = parts.filter((p) => p.functionCall != null);
			const finishReason = candidate?.finishReason as string | undefined;

			if (functionCallParts.length === 0) {
				// MALFORMED_FUNCTION_CALL means the model attempted a tool call but
				// produced syntactically invalid output. This is NOT the same as
				// stalling — nudging about "call output_operations now" is wrong here.
				// Instead, tell the model its call was malformed and ask it to retry.
				if (finishReason === "MALFORMED_FUNCTION_CALL") {
					consecutiveEmptyRounds++;

					if (consecutiveEmptyRounds > 1) {
						console.warn(
							"Interpreter: repeated MALFORMED_FUNCTION_CALL, aborting",
							{ round },
						);
						return jsonResponse({
							operations: [],
							interpretation_summary:
								"I wasn't able to process that request. Please try rephrasing.",
							is_ambiguous: false,
						});
					}

					console.warn(
						"Interpreter: MALFORMED_FUNCTION_CALL, asking model to retry",
						{ round },
					);
					contents.push({
						role: "user",
						parts: [
							{
								text: "Your last function call could not be parsed (MALFORMED_FUNCTION_CALL). This is usually caused by invalid JSON inside a string argument or an incomplete response. Please re-read the function schema and call the function again with a syntactically valid JSON payload.",
							},
						],
					});
					continue;
				}

				consecutiveEmptyRounds++;

				if (consecutiveEmptyRounds > 1) {
					// Two consecutive empty responses — nudging isn't working, give up.
					console.warn("Interpreter: model stalled after nudge, aborting", {
						round,
					});
					return jsonResponse({
						operations: [],
						interpretation_summary:
							"I wasn't able to process that request. Please try rephrasing.",
						is_ambiguous: false,
					});
				}

				if (round === MAX_TOOL_ROUNDS - 1) {
					console.warn("Interpreter: model stalled on final round", { parts });
					return jsonResponse({
						operations: [],
						interpretation_summary:
							"I wasn't able to process that request. Please try rephrasing.",
						is_ambiguous: false,
					});
				}

				// First empty response — send a single nudge and try once more.
				console.warn("Interpreter: model stalled, nudging", { round });
				contents.push({
					role: "user",
					parts: [
						{
							text: "Please proceed and call output_operations now with the operations array. If you described any actions (unlock, clear, regenerate, assign, etc.), those operations MUST be included in operations_json — do not emit an empty array if you planned to make changes.",
						},
					],
				});
				continue;
			}

			// Model produced real output — reset the stall counter.
			consecutiveEmptyRounds = 0;

			const toolResultParts: Part[] = [];
			let shouldRetry = false;

			for (const part of functionCallParts) {
				const call = part.functionCall!;

				if (call.name === "search_recipes") {
					const args = call.args as { queries: string[] };
					const results = await searchRecipes(
						session.user!.id,
						args.queries ?? [],
					);

					toolResultParts.push({
						functionResponse: {
							name: "search_recipes",
							response: {
								results: results.map((r) => ({
									id: r.id,
									name: r.name,
									description: r.description ?? "",
								})),
								count: results.length,
								hint:
									results.length === 0
										? "No recipes matched. Try shorter or alternate queries."
										: undefined,
							},
						},
					});
				} else if (call.name === "output_operations") {
					const args = call.args as {
						operations_json: string;
						interpretation_summary: string;
						is_ambiguous: boolean;
					};

					let parsedOperations: unknown;
					try {
						parsedOperations = JSON.parse(args.operations_json ?? "[]");
					} catch (jsonErr) {
						console.error(
							"Interpreter: operations_json is not valid JSON",
							args.operations_json,
						);
						toolResultParts.push({
							functionResponse: {
								name: "output_operations",
								response: {
									error:
										`operations_json could not be parsed as JSON: ${(jsonErr as Error).message}. ` +
										"This is most likely caused by missing closing braces on operation objects. " +
										"Every operation object must be fully closed before the next one begins — " +
										'e.g. {..., "payload": {...}}  (two closing braces when the op has a payload). ' +
										"Please call output_operations again with a syntactically valid JSON array.",
								},
							},
						});
						shouldRetry = true;
						break;
					}

					// Catch the "empty ops + action summary" mismatch.
					// If the model described changes it intended to make but then emitted [],
					// reject the call and force it to retry with the actual operations.
					if (
						Array.isArray(parsedOperations) &&
						parsedOperations.length === 0 &&
						summaryImpliesActions(args.interpretation_summary)
					) {
						console.warn(
							"Interpreter: empty operations with action summary — rejecting call",
							{ summary: args.interpretation_summary },
						);
						toolResultParts.push({
							functionResponse: {
								name: "output_operations",
								response: {
									error:
										"Your operations_json is empty but your interpretation_summary describes actions (unlock, clear, regenerate, etc.) that must appear in operations_json. " +
										"Call output_operations again and include those operations in the array.",
								},
							},
						});
						shouldRetry = true;
						break;
					}

					// Validate that every assign operation uses a real UUID recipe_id.
					// The model sometimes emits placeholder strings like "unknown" instead
					// of calling search_recipes first.
					const invalidRecipeIds = findInvalidRecipeIds(
						parsedOperations as unknown[],
					);
					if (invalidRecipeIds.length > 0) {
						console.warn(
							"Interpreter: assign operations contain non-UUID recipe_ids",
							{ invalidRecipeIds },
						);
						toolResultParts.push({
							functionResponse: {
								name: "output_operations",
								response: {
									error:
										`Your operations contain invalid recipe_id value(s): ${invalidRecipeIds.map((r) => JSON.stringify(r)).join(", ")}. ` +
										"Every recipe_id in an assign payload MUST be a real UUID copied from the draft SLOTS or returned by search_recipes. " +
										"Call search_recipes now to look up the correct recipe_id, then call output_operations again with the real UUID.",
								},
							},
						});
						shouldRetry = true;
						break;
					}

					// Validate that every date referenced in the operations exists in the draft.
					// The model frequently hallucinates dates when resolving day names.
					const invalidDates = findInvalidDates(
						parsedOperations as unknown[],
						validDraftDates,
					);
					if (invalidDates.length > 0) {
						const validList = [...validDraftDates]
							.map((d) => `${d} (${dayOfWeekFromDate(d)})`)
							.join(", ");
						console.warn("Interpreter: operations reference invalid dates", {
							invalidDates,
						});
						toolResultParts.push({
							functionResponse: {
								name: "output_operations",
								response: {
									error:
										`Your operations reference date(s) not present in the draft: ${invalidDates.join(", ")}. ` +
										`The only valid dates are: ${validList}. ` +
										"Call output_operations again using only dates from that list.",
								},
							},
						});
						shouldRetry = true;
						break;
					}

					const finalValidation = InterpreterResponseSchema.safeParse({
						operations: parsedOperations,
						interpretation_summary: args.interpretation_summary,
						is_ambiguous: args.is_ambiguous,
					});

					if (!finalValidation.success) {
						console.error(
							"Interpreter: output_operations args failed validation",
							finalValidation.error?.errors,
							{ parsedOperations, args },
						);
						return jsonResponse(
							{
								error: "output_operations args failed schema validation",
								details: finalValidation.error?.errors,
							},
							{ status: 500 },
						);
					}

					const enrichedData = await enrichExcludeIngredientFilters(
						finalValidation.data,
					);
					return jsonResponse(enrichedData);
				}
			}

			// If output_operations was rejected (empty ops + action summary), push
			// the rejection response and let the loop retry.
			if (shouldRetry) {
				contents.push({ role: "user", parts: toolResultParts });
				continue;
			}

			// Append tool results and loop
			contents.push({ role: "user", parts: toolResultParts });
		}

		return jsonResponse(
			{
				error: `Interpreter did not call output_operations within ${MAX_TOOL_ROUNDS} rounds`,
			},
			{ status: 500 },
		);
	} catch (error) {
		console.error("Interpreter error:", error);

		if (error instanceof Error) {
			return jsonResponse(
				{ error: `Interpreter failed: ${error.message}` },
				{ status: 500 },
			);
		}

		return jsonResponse(
			{ error: "Failed to process interpreter request" },
			{ status: 500 },
		);
	}
}

// ==========================================
// Helpers
// ==========================================

/**
 * Walks the interpreter response and enriches every `exclude_ingredient`
 * filter with a `spoonacular_ingredient_id` resolved via the Spoonacular API.
 *
 * This runs server-side after LLM output is validated so the LLM never needs
 * to know about Spoonacular IDs. The generator then uses the ID alongside the
 * name string for more precise ingredient-level filtering.
 *
 * Lookups for duplicate ingredient names are deduplicated. If a lookup fails
 * (network error, ingredient not found) the filter is returned as-is — the
 * name-based fallback in the generator still applies.
 */
async function enrichExcludeIngredientFilters(
	response: InterpreterFinalResponse,
): Promise<InterpreterFinalResponse> {
	// Collect unique ingredient names from all add_filter exclude_ingredient ops
	const ingredientNames = new Set<string>();
	for (const op of response.operations) {
		if (
			op.op === "pref_patch" &&
			op.action === "add_filter" &&
			op.payload.filter?.type === "exclude_ingredient"
		) {
			ingredientNames.add(op.payload.filter.value as string);
		}
	}

	if (ingredientNames.size === 0) return response;

	// Resolve all ingredient names in a single Spoonacular API call
	const idByName = await Spoonacular.lookupIngredientIds([...ingredientNames]);

	// Return a new response with spoonacular_ingredient_id injected into matching filters
	return {
		...response,
		operations: response.operations.map((op) => {
			if (
				op.op !== "pref_patch" ||
				op.action !== "add_filter" ||
				op.payload.filter?.type !== "exclude_ingredient"
			) {
				return op;
			}
			const ingredientName = op.payload.filter.value as string;
			const spoonacularId = idByName.get(ingredientName);
			if (spoonacularId == null) return op;
			return {
				...op,
				payload: {
					...op.payload,
					filter: {
						...op.payload.filter,
						spoonacular_ingredient_id: spoonacularId,
					},
				},
			};
		}),
	};
}

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the recipe_id values from assign operations that are not valid UUIDs.
 * Catches cases where the model emits placeholder strings like "unknown" instead
 * of calling search_recipes to resolve the real ID.
 */
function findInvalidRecipeIds(ops: unknown[]): string[] {
	const invalid: string[] = [];
	for (const op of ops) {
		if (
			typeof op !== "object" ||
			op === null ||
			(op as Record<string, unknown>).op !== "plan_edit" ||
			(op as Record<string, unknown>).action !== "assign"
		)
			continue;
		const payload = (op as Record<string, unknown>).payload as
			| Record<string, unknown>
			| undefined;
		const recipeId = payload?.recipe_id;
		if (typeof recipeId === "string" && !UUID_REGEX.test(recipeId)) {
			invalid.push(recipeId);
		}
	}
	return invalid;
}

/**
 * Returns any dates referenced in the operations array that are not in
 * `validDates`. Checks plan_edit payload.target, payload.to, and
 * regenerate_slots target fields.
 */
function findInvalidDates(ops: unknown[], validDates: Set<string>): string[] {
	const invalid = new Set<string>();
	for (const op of ops) {
		if (typeof op !== "object" || op === null) continue;
		for (const date of extractDatesFromOp(op as Record<string, unknown>)) {
			if (!validDates.has(date)) invalid.add(date);
		}
	}
	return [...invalid];
}

function extractDatesFromOp(op: Record<string, unknown>): string[] {
	const dates: string[] = [];
	const payload = op.payload as Record<string, unknown> | undefined;
	if (payload) {
		collectDatesFromTarget(payload.target, dates);
		collectDatesFromTarget(payload.to, dates);
	}
	// regenerate_slots uses op.target directly
	collectDatesFromTarget(op.target, dates);
	return dates;
}

function collectDatesFromTarget(target: unknown, out: string[]): void {
	if (!target || target === "all") return;
	if (Array.isArray(target)) {
		for (const t of target) {
			if (typeof t === "object" && t !== null && "date" in t) {
				out.push((t as { date: string }).date);
			}
		}
	} else if (
		typeof target === "object" &&
		target !== null &&
		"date" in target
	) {
		out.push((target as { date: string }).date);
	}
}

/**
 * Returns true if the interpretation_summary contains action verbs that imply
 * operations should have been emitted. Used to catch the "empty ops + planning
 * summary" mismatch before returning a bad response to the client.
 *
 * Matches both present and past tense so that phrases like "Removed pumpkin
 * chili from the plan" are caught just as reliably as "will regenerate".
 *
 * NOT matched (valid empty-ops cases):
 *   - "Undo is handled client-side."
 *   - "The recipe wasn't found in your library."
 *   - "Could not add it to your plan."
 *   - "No changes needed."
 */
function summaryImpliesActions(summary: string): boolean {
	// Strip negated verb phrases before testing so that "could not add",
	// "unable to find", "didn't regenerate", etc. are not treated as actions.
	const withoutNegations = summary.replace(
		/\b(could\s+not|would\s+not|did\s+not|was\s+not|were\s+not|can\s+not|cannot|don't|didn't|wasn't|weren't|unable\s+to|failed?\s+to|not)\s+\w+/gi,
		" ",
	);
	return /\b(unlock(ed)?|lock(ed)?|clear(ed)?|regenerat(ed|ing)?|assign(ed)?|swap(ped)?|mov(ed|ing)?|cop(ied|ying)?|remov(ed|ing)?|ban(ned)?|replac(ed)?|updat(ed)?|chang(ed)?|exclud(ed|ing)?|add(ed)?|plac(ed)?|trigger(ed)?|should\s+(have|get|receive)|will|going\s+to)\b/i.test(
		withoutNegations,
	);
}

/**
 * Search the current user's recipe library for recipes matching any of the
 * provided queries. Splits each query on whitespace AND hyphens before
 * building ilike filters so that "cottage-cheese" matches "cottage cheese".
 */
async function searchRecipes(
	userId: string,
	queries: string[],
): Promise<ResolvedRecipe[]> {
	console.debug("called search", queries);
	const baseTerms = queries.flatMap((q) =>
		q
			.toLowerCase()
			.split(/[\s\-]+/)
			.filter((t) => t.length > 1),
	);

	// Generate singular variants so that e.g. "enchiladas" also matches
	// "enchilada", "tomatoes" → "tomato", "berries" → "berry".
	const singular = (t: string): string | null => {
		if (t.endsWith("ies") && t.length > 4) return t.slice(0, -3) + "y";
		if (t.endsWith("oes") && t.length > 4) return t.slice(0, -2); // tomatoes→tomato
		if (t.endsWith("es") && t.length > 3) return t.slice(0, -1); // enchiladas handled below via 's'
		if (t.endsWith("s") && t.length > 3) return t.slice(0, -1); // enchiladas→enchilada
		return null;
	};

	const terms = [
		...new Set([
			...baseTerms,
			...baseTerms.flatMap((t) => {
				const s = singular(t);
				return s ? [s] : [];
			}),
		]),
	];

	if (terms.length === 0) return [];

	const ilikeFilters = terms
		.map((t) => `name.ilike.%${t}%,description.ilike.%${t}%`)
		.join(",");

	const { data, error } = await supabase
		.from("recipe")
		.select("id, name, description")
		.or(ilikeFilters)
		.eq("user_id", userId)
		.limit(15);

	if (error) {
		console.error("[interpret] searchRecipes error:", error);
		return [];
	}

	return (data ?? []).map((r) => ({
		id: r.id as string,
		name: r.name as string,
		description: (r.description ?? null) as string | null,
	}));
}

/**
 * Builds a compact text summary of the draft for inclusion in the LLM user turn.
 */
function buildDraftContext(
	draft: z.infer<typeof InterpreterRequestSchema>["draft"],
	profiles: { id: string; name: string }[] = [],
): string {
	const lines: string[] = [];

	const todayIso = new Date().toISOString().slice(0, 10);
	const todayDay = dayOfWeekFromDate(todayIso);
	lines.push(`Today: ${todayIso} (${todayDay})`);
	lines.push(`Session ID: ${draft.session_id}`);
	lines.push(`Profiles: ${draft.included_profile_ids.join(", ")}`);

	// Emit a human-readable PROFILES LOOKUP if names were provided.
	// The LLM uses this to resolve names to profile UUIDs for profile_servings.
	if (profiles.length > 0) {
		lines.push("");
		lines.push(
			"PROFILES LOOKUP (use profile_id for profile_servings in assign ops):",
		);
		for (const p of profiles) {
			lines.push(`  ${p.name.padEnd(20)} → ${p.id}`);
		}
	}
	// Build an explicit day-name → date(s) lookup from the actual draft slots.
	// The model MUST use this table when resolving day references — it must not
	// compute or guess dates itself.
	const uniqueDates = [
		...new Set(Object.values(draft.slots).map((s) => s.date)),
	].sort();
	const dayToDate = new Map<string, string[]>();
	for (const date of uniqueDates) {
		const day = dayOfWeekFromDate(date);
		const existing = dayToDate.get(day) ?? [];
		existing.push(date);
		dayToDate.set(day, existing);
	}
	const DAY_ORDER = [
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
		"sunday",
	];
	lines.push("");
	lines.push(
		"DAY → DATE LOOKUP (REQUIRED: resolve all day-name references using ONLY this table):",
	);
	for (const day of DAY_ORDER) {
		const dates = dayToDate.get(day);
		if (dates) {
			lines.push(`  ${day.padEnd(10)} → ${dates.join(", ")}`);
		}
	}

	lines.push("");
	lines.push("SLOTS:");

	for (const [, slot] of Object.entries(draft.slots)) {
		const day = dayOfWeekFromDate(slot.date);
		const label = `${slot.date} (${day}) ${slot.meal_type}`;
		if (slot.entries.length === 0) {
			lines.push(`  ${label}: [empty]`);
		} else {
			const entryDescriptions = slot.entries.map((e) => {
				const lockLabel = e.locked ? " [LOCKED]" : "";
				return `${e.recipe.name} (recipe_id: ${e.recipe.id}, entry_id: ${e.draft_entry_id})${lockLabel}`;
			});
			lines.push(`  ${label}: ${entryDescriptions.join(", ")}`);
		}
	}

	if (draft.preference_patch_stack.length > 0) {
		lines.push("");
		lines.push(
			`ACTIVE PREFERENCE PATCHES (${draft.preference_patch_stack.length} total):`,
		);
		for (const patch of draft.preference_patch_stack) {
			lines.push(`  ${JSON.stringify(patch)}`);
		}
	} else {
		lines.push("");
		lines.push("ACTIVE PREFERENCE PATCHES: none");
	}

	return lines.join("\n");
}
