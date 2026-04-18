import { z } from "zod";

import {
	MealTypeSchema,
	DayOfWeekSchema,
	HardFilterTypeSchema,
	HardFilterSchema,
	WeightSignalSchema,
	PrefScopeSchema,
	PrefPatchOpSchema,
	SlotTargetSchema,
	PlanEditOpSchema,
	RegenerateSlotsOpSchema,
	InterpreterOperationSchema,
	InterpreterResponseSchema,
} from "@/lib/meal-plan-draft/interpreter-schema";

// ==========================================
// Derived types — source of truth for the entire app
// ==========================================

export type MealType = z.infer<typeof MealTypeSchema>;
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;
export type HardFilterType = z.infer<typeof HardFilterTypeSchema>;
export type HardFilter = z.infer<typeof HardFilterSchema>;
export type HardFilterValue = HardFilter["value"];
export type WeightSignal = z.infer<typeof WeightSignalSchema>;
export type PrefScope = z.infer<typeof PrefScopeSchema>;
export type PrefPatchOp = z.infer<typeof PrefPatchOpSchema>;
export type SlotTarget = z.infer<typeof SlotTargetSchema>;
export type PlanEditOp = z.infer<typeof PlanEditOpSchema>;
export type RegenerateSlotsOp = z.infer<typeof RegenerateSlotsOpSchema>;
export type InterpreterOperation = z.infer<typeof InterpreterOperationSchema>;
export type InterpreterResponse = z.infer<typeof InterpreterResponseSchema>;

// Template literal type — not expressible in Zod; defined manually
export type SlotKey = `${string}.${MealType}`;

// Runtime constant derived from schema
export const MealTypes = MealTypeSchema.options;

// ==========================================
// Draft model schemas
// ==========================================

export const DraftRecipeSchema = z.object({
	id: z.string(),
	name: z.string(),
	calories_per_serving: z.number(),
	macros_per_serving: z.object({
		protein_g: z.number(),
		carbs_g: z.number(),
		fat_g: z.number(),
	}),
	servings: z.number(),
	core_ingredients: z.array(z.string()),
	image_id: z.string().nullish(),
	is_leftover: z.boolean().optional(),
	available_servings: z.number().optional(),
	expires_after: z.string().optional(),
});
export type DraftRecipe = z.infer<typeof DraftRecipeSchema>;

export const DraftProfileFoodEntrySchema = z.object({
	profile_id: z.string(),
	number_of_servings: z.number(),
});
export type DraftProfileFoodEntry = z.infer<typeof DraftProfileFoodEntrySchema>;

export const DraftFoodEntrySchema = z.object({
	draft_entry_id: z.string(),
	recipe: DraftRecipeSchema,
	locked: z.boolean(),
	profile_food_entries: z.array(DraftProfileFoodEntrySchema),
});
export type DraftFoodEntry = z.infer<typeof DraftFoodEntrySchema>;

const SlotErrorSchema = z.object({
	reason: z.literal("over_constrained"),
	filters: z.array(HardFilterSchema),
});
export type SlotError = z.infer<typeof SlotErrorSchema>;

export const DraftSlotSchema = z.object({
	date: z.string(),
	meal_type: MealTypeSchema,
	entries: z.array(DraftFoodEntrySchema),
	errors: z.array(SlotErrorSchema).optional(),
});
export type DraftSlot = z.infer<typeof DraftSlotSchema>;

// ==========================================
// MealPlanDraft
// ==========================================

// Omit<MealPlanDraft, "undo_stack"> — shared by InterpreterRequest and ChatRequestSchema
export const MealPlanDraftBaseSchema = z.object({
	session_id: z.string(),
	included_profile_ids: z.array(z.string()),
	slots: z.record(DraftSlotSchema),
	preference_patch_stack: z.array(PrefPatchOpSchema),
});

export type MealPlanDraft = z.infer<typeof MealPlanDraftBaseSchema> & {
	undo_stack: z.infer<typeof MealPlanDraftBaseSchema>[];
};

// ==========================================
// Compiled preferences (generator input)
// ==========================================

// Explicit object schema for weights so all keys are required (not Partial)
const WeightsSchema = z.object({
	protein_ratio: z.number(),
	calorie_density: z.number(),
	prep_time: z.number(),
	novelty: z.number(),
	source_preference: z.number(),
	ingredient_overlap: z.number(),
	leftover: z.number(),
});

export const CompiledSlotPreferencesSchema = z.object({
	hard_filters: z.array(HardFilterSchema),
	weights: WeightsSchema,
	assigned_recipe_id: z.string().nullable(),
	explicit_profile_servings: z.array(DraftProfileFoodEntrySchema).optional(),
});
export type CompiledSlotPreferences = z.infer<
	typeof CompiledSlotPreferencesSchema
>;

// SlotKey as a record key is not expressible in Zod; defined as a type alias
export type CompilerOutput = Record<SlotKey, CompiledSlotPreferences>;

// ==========================================
// Interpreter API Contract
// ==========================================

export type InterpreterRequest = {
	user_message: string;
	draft: z.infer<typeof MealPlanDraftBaseSchema>;
	profiles?: { id: string; name: string }[];
	conversation_history?: { role: "user" | "assistant"; content: string }[];
};

// ==========================================
// ChatRequestSchema (API input validation)
// ==========================================

export const ChatRequestSchema = z.object({
	user_message: z.string().min(1).optional(),
	draft: MealPlanDraftBaseSchema.extend({
		included_profile_ids: z.array(z.string()).min(1),
	}),
	profiles: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
	conversation_history: z
		.array(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string(),
			}),
		)
		.optional(),
	generate_all: z.boolean().optional(),
});

export type PostChatRequest = z.infer<typeof ChatRequestSchema>;
