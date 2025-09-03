import { z } from "zod";

export const ServingSchema = z.object({
	measurementDescription: z.string(), // cup
	numberOfUnits: z.number(),
	calories: z.number(),
	carbohydrateGrams: z.number(),
	fatGrams: z.number(),
	proteinGrams: z.number(),
});

export const FoodItemSchema = z.object({
	name: z.string(),
	serving: ServingSchema,
});
