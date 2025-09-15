import { FoodItemSchema } from "./food-item-schema";
import { z } from "zod";

export const Header = z.object({
	type: z.literal("header"),
	name: z.string(), // e.g. "for the sauce"
});

export const IngredientSchema = FoodItemSchema.extend({
	type: z.literal("ingredient"),
	meta: z.string().optional().nullable(), // e.g. "yellow or red"
	number_of_servings: z.number(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

export const InstructionSchema = z.object({
	type: z.literal("instruction"),
	value: z.string(),
});

export type Instruction = z.infer<typeof InstructionSchema>;

export const RecipeSchema = z.object({
	name: z.string(),
	description: z.string(),
	image_id: z.string().optional(),
	servings: z.number(),
	ingredients: z.array(z.union([IngredientSchema, Header])).optional(),
	instructions: z.array(z.union([InstructionSchema, Header])).optional(),
	prep_time_hours: z.number().optional(),
	prep_time_minutes: z.number().optional(),
	cook_time_hours: z.number().optional(),
	cook_time_minutes: z.number().optional(),
});

export type Recipe = z.infer<typeof RecipeSchema>;
