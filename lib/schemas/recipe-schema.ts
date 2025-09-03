import { FoodItemSchema } from "./food-item";
import { z } from "zod";

export const Header = z.object({
	type: z.literal("header"),
	name: z.string(), // e.g. "for the sauce"
});

export const IngredientSchema = FoodItemSchema.extend({
	type: z.literal("ingredient"),
	meta: z.string().optional().nullable(), // e.g. "yellow or red"
	numberOfServings: z.number(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

export const InstructionSchema = z.object({
	type: z.literal("instruction"),
	value: z.string(),
});

export type Instruction = z.infer<typeof InstructionSchema>;

export const RecipeSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string(),
	description: z.string(),
	imageUrl: z.string().optional(),
	servings: z.number(),
	ingredients: z.array(z.union([IngredientSchema, Header])).optional(),
	instructions: z.array(z.union([InstructionSchema, Header])).optional(),
	prepTimeHours: z.number().optional(),
	prepTimeMinutes: z.number().optional(),
	cookTimeHours: z.number().optional(),
	cookTimeMinutes: z.number().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type Recipe = z.infer<typeof RecipeSchema>;
