import { z } from "zod";

export enum MealType {
	Breakfast = "Breakfast",
	Lunch = "Lunch",
	Dinner = "Dinner",
	Snack = "Snack",
}

export enum ActionPlanTime {
	Morning = "Morning",
	Noon = "Noon",
	Night = "Night",
}

export enum MealSource {
	MealPrep = "Meal Prep",
	Leftovers = "Leftovers",
	Fresh = "Fresh",
	Mixed = "Mixed",
}

export enum DietType {
	Vegan = "Vegan",
	Vegetarian = "Vegetarian",
	Keto = "Keto",
	GlutenFree = "Gluten Free",
}

export enum AverageMealComplexity {
	Easy = "Easy",
	Medium = "Medium",
	Difficult = "Difficult",
}

export const MealTypeEnum = z.nativeEnum(MealType);
export const MealSourceEnum = z.nativeEnum(MealSource);
export const DietTypeEnum = z.nativeEnum(DietType);
export const AverageMealComplexityEnum = z.nativeEnum(AverageMealComplexity);
export const ActionPlanTimeEnum = z.nativeEnum(ActionPlanTime);

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
	mealType: MealTypeEnum,
});

export const ActionPlanEntrySchema = z.object({
	date: z.string(),
	time: ActionPlanTimeEnum,
	value: z.string(),
});

export type Serving = z.infer<typeof ServingSchema>;
export type Ingredient = z.infer<typeof IngredientSchema>;
export type Instruction = z.infer<typeof InstructionSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type UserServing = z.infer<typeof UserServingSchema>;
export type RecipeEntry = z.infer<typeof RecipeEntrySchema>;
export type ActionPlanEntry = z.infer<typeof ActionPlanEntrySchema>;
