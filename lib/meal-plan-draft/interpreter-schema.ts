/**
 * Zod schemas for validating and typing the LLM Interpreter's structured output.
 *
 * These schemas mirror the types in ./types.ts but are expressed as Zod validators
 * so they can be passed directly as a `responseSchema` to Gemini's structured-output
 * mode and used for runtime validation on the server.
 */

import { z } from "zod";

// ==========================================
// Enums
// ==========================================

export const MealTypeSchema = z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]);

export const DayOfWeekSchema = z.enum([
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
]);

// ==========================================
// Hard Filters
// ==========================================

export const HardFilterTypeSchema = z.enum([
	"exclude_ingredient",
	"dietary_restriction",
	"max_prep_time",
	"max_ingredient_count",
	"include_cuisine",
	"source_restriction",
]);

export const HardFilterSchema = z.object({
	type: HardFilterTypeSchema,
	/**
	 * Value shape by type:
	 *   exclude_ingredient / dietary_restriction / source_restriction → string
	 *   max_prep_time / max_ingredient_count → number
	 *   include_cuisine → string[]
	 *
	 * Represented as a union rather than a discriminated union to keep the
	 * schema flat — the LLM does not need to nest a second `type` tag inside
	 * the value. Callers discriminate on the outer `type` field before reading.
	 */
	value: z
		.union([z.string(), z.number(), z.array(z.string())])
		.describe(
			"string for exclude_ingredient/dietary_restriction/source_restriction, " +
				"number for max_prep_time/max_ingredient_count, " +
				"string[] for include_cuisine",
		),
	unit: z
		.string()
		.optional()
		.describe("Unit of the value when applicable, e.g. 'minutes'"),
});

// ==========================================
// Weight Signal
// ==========================================

export const WeightSignalSchema = z.enum([
	"protein_ratio",
	"calorie_density",
	"prep_time",
	"novelty",
	"source_preference",
	"ingredient_overlap",
	"leftover",
]);

// ==========================================
// Preference Scope
// ==========================================

export const PrefScopeSchema = z
	.object({
		days: z
			.array(DayOfWeekSchema)
			.optional()
			.describe("Restrict patch to these days of the week"),
		meal_types: z
			.array(MealTypeSchema)
			.optional()
			.describe("Restrict patch to these meal types"),
	})
	.describe(
		"Scope for the patch. Omit both fields to apply globally within a non-null scope object. " +
			"Pass null at the op level to apply globally across all slots.",
	);

// ==========================================
// Operations
// ==========================================

export const PrefPatchOpSchema = z
	.object({
		op: z.literal("pref_patch"),
		action: z
			.enum(["add_filter", "remove_filter", "set_weight", "remove_weight"])
			.describe(
				"add_filter — add a hard constraint. " +
					"remove_filter — remove a previously added hard constraint. " +
					"set_weight — adjust a scoring signal multiplier. " +
					"remove_weight — reset a scoring signal multiplier to 1.0.",
			),
		scope: z
			.union([PrefScopeSchema, z.null()])
			.describe(
				"null = apply globally to all slots. " +
					"Object = apply only to matching day/meal_type combinations.",
			),
		payload: z
			.object({
				filter: HardFilterSchema.optional().describe(
					"Required for add_filter and remove_filter actions",
				),
				weight: z
					.object({
						signal: WeightSignalSchema,
						value: z.number().describe("Target multiplier. Default is 1.0."),
					})
					.optional()
					.describe("Required for set_weight action"),
			})
			.describe(
				"Must contain either `filter` or `weight` depending on `action`",
			),
	})
	.describe("Updates the accumulated preference patch stack");

export const SlotTargetSchema = z.object({
	date: z.string().describe("ISO date string (YYYY-MM-DD)"),
	meal_type: MealTypeSchema,
});

export const PlanEditOpSchema = z
	.object({
		op: z.literal("plan_edit"),
		action: z
			.enum([
				"swap",
				"move",
				"copy",
				"clear",
				"assign",
				"add_slot",
				"remove_slot",
				"lock",
				"unlock",
			])
			.describe(
				"swap — exchange two slots. " +
					"move — move a recipe from one slot to another. " +
					"copy — copy a recipe to another slot. " +
					"clear — empty slot entries without removing the slot. " +
					"assign — place a specific recipe in a slot (optionally locks it). " +
					"add_slot — add a new meal-type row to all days in the plan. " +
					"remove_slot — remove a meal-type row from the plan structure. " +
					"lock — mark entries as locked so the generator skips them. " +
					"unlock — mark entries as unlocked so the generator can replace them.",
			),
		payload: z.object({
			target: z
				.union([SlotTargetSchema, z.array(SlotTargetSchema), z.literal("all")])
				.optional()
				.describe(
					"The slot(s) to act on. Use 'all' to target every slot in the draft.",
				),
			draft_entry_id: z
				.string()
				.optional()
				.describe(
					"Target a specific DraftFoodEntry within a slot by its ephemeral UUID",
				),
			to: z
				.union([SlotTargetSchema, z.array(SlotTargetSchema)])
				.optional()
				.describe("Destination slot(s) for swap, move, and copy actions"),
			recipe_id: z
				.string()
				.optional()
				.describe(
					"Recipe ID for the assign action — resolved from a recipe_search_request, never invented",
				),
			recipe_name: z
				.string()
				.optional()
				.describe(
					"Human-readable name of the assigned recipe, copied from the search result",
				),
			lock: z
				.boolean()
				.optional()
				.describe("When true, the assigned entry is immediately locked"),
			meal_type: MealTypeSchema.optional().describe(
				"Meal type to add for the add_slot action",
			),
		}),
	})
	.describe(
		"Structural edits to the draft layout and slot-level state changes",
	);

export const RegenerateSlotsOpSchema = z
	.object({
		op: z.literal("regenerate_slots"),
		target: z
			.union([z.array(SlotTargetSchema), z.null()])
			.describe(
				"Specific slots to regenerate, or null to regenerate all unlocked slots",
			),
	})
	.describe("Triggers the generator on the specified slots");

export const InterpreterOperationSchema = z.discriminatedUnion("op", [
	PrefPatchOpSchema,
	PlanEditOpSchema,
	RegenerateSlotsOpSchema,
]);

// ==========================================
// Full Interpreter Response Schema
// ==========================================

export const InterpreterResponseSchema = z.object({
	operations: z
		.array(InterpreterOperationSchema)
		.describe(
			"Ordered list of operations to execute this turn. " +
				"Structural edits (plan_edit) must precede regenerate_slots. " +
				"Lock/unlock operations must precede regenerate_slots.",
		),
	interpretation_summary: z
		.string()
		.describe(
			"Human-readable sentence describing what the interpreter understood the user to want. " +
				"Always present. Surfaced by the UI on ambiguous requests.",
		),
	is_ambiguous: z
		.boolean()
		.describe(
			"True when the interpreter made a reasonable assumption to resolve ambiguity. " +
				"When true, the UI should surface `interpretation_summary` as a confirmation message.",
		),
});

// ==========================================
// Recipe resolution (for the search-request / follow-up flow)
// ==========================================

/**
 * A single recipe returned by the server's recipe search during a
 * `recipe_search_request` round-trip.
 */
export const ResolvedRecipeSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
});

// ==========================================
// Inferred types (source of truth for API callers)
// ==========================================

export type InterpreterResponseFromSchema = z.infer<
	typeof InterpreterResponseSchema
>;
export type InterpreterOperationFromSchema = z.infer<
	typeof InterpreterOperationSchema
>;
export type PrefPatchOpFromSchema = z.infer<typeof PrefPatchOpSchema>;
export type PlanEditOpFromSchema = z.infer<typeof PlanEditOpSchema>;
export type RegenerateSlotsOpFromSchema = z.infer<
	typeof RegenerateSlotsOpSchema
>;
export type HardFilterFromSchema = z.infer<typeof HardFilterSchema>;
export type ResolvedRecipe = z.infer<typeof ResolvedRecipeSchema>;
export type InterpreterFinalResponse = z.infer<
	typeof InterpreterResponseSchema
>;
