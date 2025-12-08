import { FoodItemSchema } from "./food-item-schema";
import { NoteSchema } from "./note-schema";
import { z } from "zod";

export const UserServingSchema = z.object({
	profile_id: z.string(),
	number_of_servings: z.number(),
});
export type UserServing = z.infer<typeof UserServingSchema>;

export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof MealTypeSchema>;

const BaseEntrySchema = z.object({
	id: z.string(),
	user_id: z.string(),
	profile_servings: z.array(UserServingSchema),
	meal_type: MealTypeSchema,
	note: NoteSchema.optional(),
	date: z.coerce.date(),
	created_at: z.coerce.date(),
	updated_at: z.coerce.date(),
});

export const RecipeEntrySchema = BaseEntrySchema.extend({
	type: z.literal("recipe"),
	recipe_id: z.string(),
});

export const FoodItemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("food_item"),
}).merge(FoodItemSchema);

export const FoodEntrySchema = z.union([
	RecipeEntrySchema,
	FoodItemEntrySchema,
]);
export type FoodEntry = z.infer<typeof FoodEntrySchema>;
