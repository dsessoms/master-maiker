import { FoodItemSchema } from "./food-item";
import { NoteSchema } from "./note";
import { z } from "zod";

export const UserServingSchema = z.object({
	userId: z.string(),
	numberOfServings: z.number(),
});
export type UserServing = z.infer<typeof UserServingSchema>;

export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof MealTypeSchema>;

const BaseEntrySchema = z.object({
	id: z.string(),
	userId: z.string(),
	userServings: z.array(UserServingSchema),
	mealType: MealTypeSchema,
	note: NoteSchema.optional(),
	date: z.coerce.date(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const RecipeEntrySchema = BaseEntrySchema.extend({
	type: z.literal("recipe"),
	recipeId: z.string(),
});

export const FoodItemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("foodItem"),
}).merge(FoodItemSchema);

export const FoodEntrySchema = z.union([
	RecipeEntrySchema,
	FoodItemEntrySchema,
]);
export type FoodEntry = z.infer<typeof FoodEntrySchema>;
