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
} from "@/lib/meal-plan-draft/interpreter-schema";
import { dayOfWeekFromDate } from "@/lib/meal-plan-draft";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";
import { supabase } from "@/config/supabase-server";
import { z } from "zod";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const MAX_TOOL_ROUNDS = 5;

// ==========================================
// Request validation
// ==========================================

const InterpreterRequestSchema = z.object({
	user_message: z.string().min(1),
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
			"Call this BEFORE emitting any assign operation to obtain the real recipe_id. " +
			"Never invent or guess a recipe_id. " +
			"Provide alternate phrasings as separate queries to handle hyphenation or synonym mismatches " +
			'(e.g. "cottage cheese pancakes" AND "cottage-cheese pancakes").',
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
						'  { "op": "plan_edit", "action": "swap"|"move"|"copy"|"clear"|"assign"|"add_slot"|"remove_slot"|"lock"|"unlock", "payload": {target?,to?,recipe_id?,recipe_name?,lock?,meal_type?,draft_entry_id?} }\n' +
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
    { "op": "pref_patch", "action": "set_weight",  "scope": { "days": ["monday"], "meal_types": ["Dinner"] }, "payload": { "weight": { "signal": "calorie_density", "value": 1.8 } } }
    { "op": "pref_patch", "action": "remove_weight", "scope": null, "payload": { "weight": { "signal": "novelty", "value": 1.0 } } }

  plan_edit:
    { "op": "plan_edit", "action": "assign", "payload": { "target": { "date": "2026-04-07", "meal_type": "Dinner" }, "recipe_id": "<uuid>", "recipe_name": "<name>", "lock": true } }
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
    add_filter    — add a hard constraint (exclude ingredient, dietary restriction, max prep time, cuisine allow-list)
    remove_filter — remove a previously added hard constraint
    set_weight    — adjust a scoring signal multiplier (>1.0 boosts, 0.0–1.0 penalises)
    remove_weight — reset a scoring signal to its default of 1.0
    scope rules: null = all slots | { days } = those days all meals | { meal_types } = those meals all days | { days, meal_types } = exact intersection

  plan_edit actions:
    swap        — exchange the recipes between two slots (target ↔ to)
    move        — move a recipe from target to to (clears origin)
    copy        — copy a recipe from target to to (keeps origin)
    clear       — empty a slot's entries without removing the slot
    assign      — place a specific recipe (by recipe_id) into a slot; set lock:true to immediately lock it
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

"Undo that":
  []   (undo is handled client-side; say so in interpretation_summary)

RECIPE ASSIGNMENT RULES:
  - NEVER invent or guess a recipe_id.
  - Before emitting any assign operation, call search_recipes to obtain the real id.
  - Pick the best match from results by name/description similarity.
  - If results are empty, call output_operations with empty operations and explain the recipe wasn't found.
  - Include both recipe_id and recipe_name in the assign payload.

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

		const { user_message, draft } = validation.data;

		// Pre-compute the set of dates that actually exist in this draft.
		// Used to reject operations that reference hallucinated dates.
		const validDraftDates = new Set(
			Object.values(draft.slots).map((s) => s.date),
		);

		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

		const userTurn = `${user_message}

--- CURRENT DRAFT STATE ---
${buildDraftContext(draft)}`;

		const contents: Content[] = [{ role: "user", parts: [{ text: userTurn }] }];

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
					maxOutputTokens: 8_000,
					temperature: 0.2,
				},
			});

			const candidate = response.candidates?.[0];
			const parts = candidate?.content?.parts ?? [];

			// Append model turn to conversation history (even if parts is empty,
			// so the conversation stays valid for the next round).
			if (candidate?.content) {
				contents.push({
					role: "model",
					parts: parts.length > 0 ? parts : [{ text: "" }],
				});
			}

			const functionCallParts = parts.filter((p) => p.functionCall != null);

			if (functionCallParts.length === 0) {
				if (round === MAX_TOOL_ROUNDS - 1) {
					// Last round and still no function call — give up gracefully.
					console.warn("Interpreter: model stalled on final round", { parts });
					return jsonResponse({
						operations: [],
						interpretation_summary:
							"I wasn't able to process that request. Please try rephrasing.",
						is_ambiguous: false,
					});
				}
				// Model stalled mid-conversation (common after search_recipes returns
				// results). Nudge it and let the loop continue.
				console.warn("Interpreter: model stalled, nudging", { round, parts });
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
					} catch {
						console.error(
							"Interpreter: operations_json is not valid JSON",
							args.operations_json,
						);
						return jsonResponse(
							{ error: "Model returned invalid JSON for operations_json" },
							{ status: 500 },
						);
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

					return jsonResponse(finalValidation.data);
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
 */
function summaryImpliesActions(summary: string): boolean {
	return /\b(unlock|lock|clear|regenerat|assign|swap|move|copy|add[\s_-]slot|remove[\s_-]slot|will|going to)\b/i.test(
		summary,
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
	const terms = [
		...new Set(
			queries.flatMap((q) =>
				q
					.toLowerCase()
					.split(/[\s\-]+/)
					.filter((t) => t.length > 1),
			),
		),
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
): string {
	const lines: string[] = [];

	const todayIso = new Date().toISOString().slice(0, 10);
	const todayDay = dayOfWeekFromDate(todayIso);
	lines.push(`Today: ${todayIso} (${todayDay})`);
	lines.push(`Session ID: ${draft.session_id}`);
	lines.push(`Profiles: ${draft.included_profile_ids.join(", ")}`);

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
				return `${e.recipe.name} (entry_id: ${e.draft_entry_id})${lockLabel}`;
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
