import { z } from "zod";

export const ServingSchema = z.object({
	measurement_description: z.string(), // cup
	serving_description: z.string().optional(), // 1 cup
	number_of_units: z.number(),
	calories: z.number(),
	carbohydrate_grams: z.number(),
	fat_grams: z.number(),
	protein_grams: z.number(),
});

export const FoodItemSchema = z.object({
	name: z.string(),
	serving: ServingSchema,
});
