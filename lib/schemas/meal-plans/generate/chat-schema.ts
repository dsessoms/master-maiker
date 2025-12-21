// Simplified schemas for meal plan generation
// Minimal nesting to avoid exceeding Gemini's max depth

import { z } from "zod";

// Request schemas
export const MealPlanChatMessageSchema = z.object({
	role: z.enum(["assistant", "user"]),
	content: z.string(),
});

export const MealPlanChatRequestSchema = z.object({
	messages: z.array(MealPlanChatMessageSchema).min(1),
});

// Response schemas

// Single recipe schema - use isExisting to differentiate
const MealPlanChatRecipeSchema = z.object({
	isExisting: z.boolean(),
	id: z.string(),
	name: z.string().optional(),
	servings: z.number().optional(),
	ingredients: z.array(z.string()).optional(),
	instructions: z.array(z.string()).optional(),
});

const MealPlanChatFoodEntrySchema = z.object({
	profile_servings: z
		.record(z.string(), z.number())
		.describe("maps profile_id to the number of servings"),
	recipe_id: z.string(),
	date: z.string(),
	meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
	number_of_servings: z.number(),
});

const MealPlanChatNoteEntrySchema = z.object({
	date: z.string(),
	meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
	note: z.string(),
});

export const GeneratedMealPlanSchema = z.object({
	recipes: z.array(MealPlanChatRecipeSchema),
	foodEntries: z.array(MealPlanChatFoodEntrySchema),
	notes: z.array(MealPlanChatNoteEntrySchema),
});

export const MealPlanChatResponseSchema = z.object({
	content: z.string(),
	mealPlan: GeneratedMealPlanSchema.optional(),
	text: z.string().optional(),
});

// Request types
export type MealPlanChatMessage = z.infer<typeof MealPlanChatMessageSchema>;
export type MealPlanChatRequest = z.infer<typeof MealPlanChatRequestSchema>;

// Response types
export type MealPlanChatRecipe = z.infer<typeof MealPlanChatRecipeSchema>;
export type MealPlanChatFoodEntry = z.infer<typeof MealPlanChatFoodEntrySchema>;
export type MealPlanChatNoteEntry = z.infer<typeof MealPlanChatNoteEntrySchema>;
export type GeneratedMealPlan = z.infer<typeof GeneratedMealPlanSchema>;
export type MealPlanChatChatResponse = z.infer<
	typeof MealPlanChatResponseSchema
>;
