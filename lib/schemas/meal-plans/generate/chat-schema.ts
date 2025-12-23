// Simplified schemas for meal plan generation
// Minimal nesting to avoid exceeding Gemini's max depth

import { z } from "zod";

// Request schemas
export const MealPlanChatMessageSchema = z.object({
	role: z
		.enum(["assistant", "user"])
		.describe("Message sender role in the conversation"),
	content: z.string().describe("Text content of the message"),
});

export const MealPlanChatRequestSchema = z.object({
	messages: z
		.array(MealPlanChatMessageSchema)
		.min(1)
		.describe(
			"Conversation history array containing at least one message for meal plan generation context",
		),
});

// Response schemas

// Recipe schema with source type differentiation
const MealPlanChatRecipeSchema = z.object({
	type: z
		.enum(["saved", "generated", "spoonacular"])
		.describe(
			"Recipe source type: 'saved' - existing user recipe from database; 'generated' - newly created recipe by LLM during meal plan generation; 'spoonacular' - recipe fetched from the Spoonacular API",
		),
	id: z.string().describe("Unique identifier for the recipe"),
	name: z.string().optional().describe("Display name of the recipe"),
	servings: z
		.number()
		.optional()
		.describe("Default number of servings the recipe yields"),
	ingredients: z
		.array(z.string())
		.optional()
		.describe("List of ingredients with quantities"),
	instructions: z
		.array(z.string())
		.optional()
		.describe("Step-by-step cooking instructions"),
});

const MealPlanChatFoodEntrySchema = z.object({
	profile_servings: z
		.record(z.string(), z.number())
		.describe(
			"Map of profile IDs to serving quantities - specifies how many servings each profile/person consumes for this meal entry",
		),
	recipe_id: z
		.string()
		.describe("Reference to the recipe used in this food entry"),
	date: z.string().describe("Date of the meal in ISO 8601 format (YYYY-MM-DD)"),
	meal_type: z
		.enum(["breakfast", "lunch", "dinner", "snack"])
		.describe("Type/category of the meal"),
	number_of_servings: z
		.number()
		.describe("Total number of servings prepared for this meal entry"),
});

const MealPlanChatNoteEntrySchema = z.object({
	date: z.string().describe("Date of the note in ISO 8601 format (YYYY-MM-DD)"),
	meal_type: z
		.enum(["breakfast", "lunch", "dinner", "snack"])
		.describe("Meal type this note is associated with"),
	note: z
		.string()
		.describe(
			"Text content of the note - can include dietary notes, preferences, or reminders",
		),
});

export const GeneratedMealPlanSchema = z.object({
	recipes: z
		.array(MealPlanChatRecipeSchema)
		.describe(
			"Collection of all recipes referenced in the meal plan, including saved, generated, and Spoonacular recipes",
		),
	foodEntries: z
		.array(MealPlanChatFoodEntrySchema)
		.describe(
			"Scheduled meal entries that map recipes to specific dates, meal types, and servings per profile",
		),
	notes: z
		.array(MealPlanChatNoteEntrySchema)
		.describe(
			"Optional notes associated with specific meals for dietary guidance or reminders",
		),
});

export const MealPlanChatResponseSchema = z.object({
	content: z
		.string()
		.describe(
			"Conversational response text from the assistant explaining the meal plan or answering user queries",
		),
	mealPlan: GeneratedMealPlanSchema.optional().describe(
		"Complete meal plan structure with recipes, food entries, and notes - only present when a meal plan is generated",
	),
	text: z
		.string()
		.optional()
		.describe("Additional text content or metadata for the response"),
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
