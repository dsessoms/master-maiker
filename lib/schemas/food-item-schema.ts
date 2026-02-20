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
	sugar_grams: z.number().optional(),
	sodium_mg: z.number().optional(),
	fiber_grams: z.number().optional(),
	potassium_mg: z.number().optional(),
	vitamin_d_mcg: z.number().optional(),
	vitamin_a_mcg: z.number().optional(),
	vitamin_c_mg: z.number().optional(),
	calcium_mg: z.number().optional(),
	iron_mg: z.number().optional(),
	trans_fat_grams: z.number().optional(),
	cholesterol_mg: z.number().optional(),
	saturated_fat_grams: z.number().optional(),
	polyunsaturated_fat_grams: z.number().optional(),
	monounsaturated_fat_grams: z.number().optional(),
	fat_secret_id: z.number().optional(), // For tracking fat secret serving ID
});

export const FoodItemSchema = z.object({
	name: z.string(),
	original_name: z.string().optional(), // The original user-entered or parsed name
	// TODO: only allow specific urls in database
	image_url: z.string().optional(),
	aisle: z.string().optional(),
	serving: ServingSchema,
	food_type: z.enum(["Generic", "Brand"]),
	fat_secret_id: z.number().optional(), // For tracking fat secret food ID
	spoonacular_id: z.number().optional(), // For tracking spoonacular food ID
});
