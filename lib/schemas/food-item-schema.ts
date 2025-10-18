import { z } from "zod";

export const ServingSchema = z.object({
	measurement_description: z.string(), // cup
	serving_description: z.string().optional(), // 1 cup
	metric_serving_amount: z.number().optional(), // 1
	metric_serving_unit: z.string().optional(),
	number_of_units: z.number(),
	calories: z.number(),
	carbohydrate_grams: z.number(),
	fat_grams: z.number(),
	protein_grams: z.number(),
	fat_secret_id: z.number().optional(), // For tracking fat secret serving ID
});

export const FoodItemSchema = z.object({
	name: z.string(),
	original_name: z.string().optional(), // The original user-entered or parsed name
	// TODO: only allow specific urls in database
	image_url: z.string().optional(),
	serving: ServingSchema,
	fat_secret_id: z.number().optional(), // For tracking fat secret food ID
	spoonacular_id: z.number().optional(), // For tracking spoonacular food ID
});
