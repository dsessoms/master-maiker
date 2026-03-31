/**
 * POST /api/meal-plans/generate/interpret
 *
 * LLM Interpreter — Layer 1 of the meal plan generation pipeline.
 *
 * Accepts a user message and the current draft state, then calls the Gemini
 * API with structured-output mode to translate the natural-language request
 * into an ordered list of `InterpreterOperation` objects.
 *
 * The response is validated against `InterpreterResponseSchema` before being
 * returned to the client. The client is responsible for:
 *   1. Applying `plan_edit` operations to the local draft state.
 *   2. Running the Preference Compiler over the updated draft.
 *   3. Passing the compiler output to the Generator.
 *
 * This endpoint is intentionally stateless — it does not mutate the draft.
 */

import { GoogleGenAI } from "@google/genai";
import {
	InterpreterResponseSchema,
	type InterpreterResponseFromSchema,
} from "@/lib/meal-plan-draft/interpreter-schema";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

// ==========================================
// Request validation
// ==========================================

const InterpreterRequestSchema = z.object({
	user_message: z.string().min(1),
	draft: z.object({
		session_id: z.string(),
		included_profile_ids: z.array(z.string()),
		// Slots and patch stack arrive as JSON — validated structurally by
		// InterpreterResponseSchema on the way out, not on the way in.
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
// System prompt
// ==========================================

const SYSTEM_PROMPT = `You are the LLM Interpreter for an AI-powered meal plan generation system.

YOUR ROLE:
You translate plain-language user requests into a precise, ordered list of structured operations that modify a meal plan draft. You do NOT generate recipes, fill slots, or make food choices — those are handled downstream by a deterministic generator.

THE OPERATION TYPES:

1. pref_patch — Updates the preference patch stack. Use this to express constraints and scoring signals.
   - add_filter: Add a hard constraint (e.g., exclude an ingredient, set max prep time, restrict cuisines)
   - remove_filter: Remove a previously added hard constraint
   - set_weight: Adjust a scoring signal multiplier (values > 1.0 boost, 0.0–1.0 penalise)
   - remove_weight: Reset a scoring signal to its default of 1.0
   
   Scope rules:
   - scope: null → apply globally to all slots
   - scope with days only → apply to those days across all meal types
   - scope with meal_types only → apply to those meal types across all days
   - scope with both → apply only to that day + meal_type intersection

2. plan_edit — Structural changes to the draft layout and slot state.
   - swap: Exchange recipes between two slots
   - move: Move a recipe from one slot to another (clears origin)
   - copy: Copy a recipe to another slot (keeps origin)
   - clear: Empty a slot's entries without removing the slot from the structure
   - assign: Place a specific recipe by ID into a slot (set lock: true to immediately lock it)
   - add_slot: Add a new meal type row to every day in the plan
   - remove_slot: Remove a meal type row from the plan structure entirely
   - lock: Mark entries as locked so the generator never replaces them
   - unlock: Mark entries as unlocked so the generator can fill them

3. regenerate_slots — Triggers the generator to fill unlocked slots.
   - target: array of {date, meal_type} to regenerate, or null for ALL unlocked slots

ORDERING RULES (CRITICAL):
Operations in the array are executed IN ORDER. You must always respect this sequence:
  1. plan_edit (unlock/lock) → must come before regenerate_slots
  2. plan_edit (structural: swap/move/copy/clear/assign/add_slot/remove_slot) → must come before regenerate_slots
  3. pref_patch → should precede the regenerate_slots that uses those preferences
  4. regenerate_slots → always last in a sequence

COMMON PATTERNS:

"No kale":
  → pref_patch(add_filter, scope:null, exclude_ingredient:"kale")
  → regenerate_slots(null)

"Replace Monday dinner with something lighter":
  → pref_patch(set_weight, scope:{days:["monday"], meal_types:["Dinner"]}, calorie_density:1.8)
  → regenerate_slots([{date: <monday's date>, meal_type: "Dinner"}])

"Keep all lunches, just redo dinners":
  → plan_edit(lock, target: all lunch slots)
  → regenerate_slots(all dinner slots)

"Weekends more flexible, make them fun":
  → pref_patch(set_weight, scope:{days:["saturday","sunday"]}, novelty:1.8)
  → regenerate_slots(saturday and sunday slots)

"Use my beef and broccoli on Monday dinner":
  → plan_edit(assign, target:{date, meal_type:"Dinner"}, recipe_id:<id>, lock:true)
  (no regenerate_slots unless other slots need filling)

"Same breakfast every day":
  → regenerate_slots([monday.Breakfast]) — just fill monday
  → plan_edit(copy, from:monday.Breakfast, to:[tue,wed,thu,fri,sat,sun].Breakfast)
  → plan_edit(lock, target: all Breakfast slots)

"Start completely over":
  → plan_edit(unlock, target:"all")
  → regenerate_slots(null)
  NOTE: Do NOT reset pref_patches — accumulated session preferences persist.

"Undo that":
  → emit an empty operations array with interpretation_summary explaining undo is handled client-side

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
  - Always return interpretation_summary (one sentence, plain language).

CURRENT DRAFT CONTEXT:
  You will receive the current draft state in the user turn. Use it to:
  - Identify exact slot dates and meal types to target
  - Reference locked/unlocked state when emitting lock/unlock operations
  - Understand which preference patches are already active`;

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

		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

		// Build the user turn: the actual request + full draft context
		const draftContext = buildDraftContext(draft);
		const userTurn = `${user_message}

--- CURRENT DRAFT STATE ---
${draftContext}`;

		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash-lite",
			contents: [
				{
					role: "user",
					parts: [{ text: userTurn }],
				},
			],
			config: {
				systemInstruction: {
					role: "user",
					parts: [{ text: SYSTEM_PROMPT }],
				},
				responseMimeType: "application/json",
				responseJsonSchema: zodToJsonSchema(InterpreterResponseSchema),
				maxOutputTokens: 8_000,
				temperature: 0.2, // Low temperature for deterministic operation translation
			},
		});

		const text = response.text;
		if (!text) {
			return jsonResponse({ error: "No response from AI" }, { status: 500 });
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			console.error("Interpreter: failed to parse AI JSON response", text);
			return jsonResponse(
				{ error: "Failed to parse AI response as JSON" },
				{ status: 500 },
			);
		}

		// Validate the parsed response against our schema
		const responseValidation = InterpreterResponseSchema.safeParse(parsed);
		if (!responseValidation.success) {
			console.error(
				"Interpreter: AI response failed schema validation",
				responseValidation.error.errors,
				parsed,
			);
			return jsonResponse(
				{
					error: "AI response did not match expected schema",
					details: responseValidation.error.errors,
				},
				{ status: 500 },
			);
		}

		return jsonResponse(
			responseValidation.data as InterpreterResponseFromSchema,
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
 * Builds a compact text summary of the draft for inclusion in the LLM user turn.
 * Keeps the context concise while providing everything the interpreter needs:
 *   - The slot layout with dates, meal types, and recipe names
 *   - Lock state per entry
 *   - Active preference patches (for context on what's already constrained)
 */
function buildDraftContext(
	draft: z.infer<typeof InterpreterRequestSchema>["draft"],
): string {
	const lines: string[] = [];

	lines.push(`Session ID: ${draft.session_id}`);
	lines.push(`Profiles: ${draft.included_profile_ids.join(", ")}`);
	lines.push("");
	lines.push("SLOTS:");

	for (const [slotKey, slot] of Object.entries(draft.slots)) {
		if (slot.entries.length === 0) {
			lines.push(`  ${slotKey}: [empty]`);
		} else {
			const entryDescriptions = slot.entries.map((e) => {
				const lockLabel = e.locked ? " [LOCKED]" : "";
				return `${e.recipe.name} (entry_id: ${e.draft_entry_id})${lockLabel}`;
			});
			lines.push(`  ${slotKey}: ${entryDescriptions.join(", ")}`);
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
