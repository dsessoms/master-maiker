import { z } from "zod";

const MealType = z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]);
const ActionPlanTime = z.enum(["Morning", "Noon", "Night"]);

const ServingSchema = z.object({
	measurementDescription: z.string(),
	numberOfUnits: z.number(),
	calories: z.number(),
	carbohydrateGrams: z.number(),
	fatGrams: z.number(),
	proteinGrams: z.number(),
});

const IngredientSchema = z.object({
	name: z.string(),
	meta: z.string(),
	numberOfServings: z.number(),
	serving: ServingSchema,
});

const InstructionSchema = z.object({
	value: z.string(),
});

export const RecipeSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	imageUrl: z.string().optional(),
	servings: z.number(),
	ingredients: z.array(IngredientSchema),
	instructions: z.array(InstructionSchema),
});

const UserServingSchema = z.object({
	userId: z.string(),
	numberOfServings: z.number(),
});

export const RecipeEntrySchema = z.object({
	recipeId: z.string(),
	userServings: z.array(UserServingSchema),
	date: z.string(),
	mealType: MealType,
});

export const ActionPlanEntrySchema = z.object({
	date: z.string(),
	time: ActionPlanTime,
	value: z.string(),
});
