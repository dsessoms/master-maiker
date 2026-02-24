import { Recipe } from "@/lib/schemas";
import type { Tables } from "@/database.types";

/**
 * Converts a recipe from the database format to a Recipe schema object
 * @param recipe - The recipe from the database
 * @returns A Recipe object matching the schema format
 */
export function convertDatabaseRecipeToSchema(
	recipe: Tables<"recipe"> & {
		ingredient?: (Tables<"ingredient"> & {
			food?: Tables<"food"> | null;
			serving?: Tables<"serving"> | null;
		})[];
		instruction?: Tables<"instruction">[];
	},
): Recipe {
	return {
		name: recipe.name || "",
		description: recipe.description || "",
		servings: recipe.number_of_servings || 1,
		prep_time_hours: recipe.prep_time_hours || 0,
		prep_time_minutes: recipe.prep_time_minutes || 0,
		cook_time_hours: recipe.cook_time_hours || 0,
		cook_time_minutes: recipe.cook_time_minutes || 0,
		image_id: recipe.image_id || undefined,
		ingredients:
			recipe.ingredient?.map((ing) => {
				if (ing.type === "header") {
					return {
						type: "header" as const,
						name: ing.name || "",
					};
				}
				return {
					type: "ingredient" as const,
					name: ing.food?.food_name || ing.name || "",
					original_name: ing.original_name || undefined,
					food_type: (ing.food?.food_type as "Brand" | "Generic") || "Generic",
					aisle: ing.food?.aisle || undefined,
					meta: ing.meta || undefined,
					number_of_servings: ing.number_of_servings || 1,
					fat_secret_id: ing.food?.fat_secret_id || undefined,
					spoonacular_id: ing.food?.spoonacular_id || undefined,
					image_url: ing.food?.image_url || undefined,
					serving: ing.serving
						? {
								measurement_description:
									ing.serving.measurement_description || "",
								serving_description:
									ing.serving.serving_description || undefined,
								metric_serving_amount:
									ing.serving.metric_serving_amount || undefined,
								metric_serving_unit:
									ing.serving.metric_serving_unit || undefined,
								number_of_units: ing.serving.number_of_units || 1,
								calories: ing.serving.calories || 0,
								carbohydrate_grams: ing.serving.carbohydrate || 0,
								fat_grams: ing.serving.fat || 0,
								protein_grams: ing.serving.protein || 0,
								sugar_grams: ing.serving.sugar || undefined,
								sodium_mg: ing.serving.sodium || undefined,
								fiber_grams: ing.serving.fiber || undefined,
								potassium_mg: ing.serving.potassium || undefined,
								vitamin_d_mcg: ing.serving.vitamin_d || undefined,
								vitamin_a_mcg: ing.serving.vitamin_a || undefined,
								vitamin_c_mg: ing.serving.vitamin_c || undefined,
								calcium_mg: ing.serving.calcium || undefined,
								iron_mg: ing.serving.iron || undefined,
								trans_fat_grams: ing.serving.trans_fat || undefined,
								cholesterol_mg: ing.serving.cholesterol || undefined,
								saturated_fat_grams: ing.serving.saturated_fat || undefined,
								polyunsaturated_fat_grams:
									ing.serving.polyunsaturated_fat || undefined,
								monounsaturated_fat_grams:
									ing.serving.monounsaturated_fat || undefined,
								fat_secret_id: ing.serving.fat_secret_id || undefined,
							}
						: {
								measurement_description: "serving",
								number_of_units: 1,
								calories: 0,
								carbohydrate_grams: 0,
								fat_grams: 0,
								protein_grams: 0,
							},
				};
			}) || [],
		instructions:
			recipe.instruction?.map((inst) => {
				if (inst.type === "header") {
					return {
						type: "header" as const,
						name: inst.name || "",
					};
				}
				return {
					type: "instruction" as const,
					value: inst.value || "",
				};
			}) || [],
	};
}
