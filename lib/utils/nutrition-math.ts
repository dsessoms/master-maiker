export interface NutritionValues {
	calories: number;
	protein: number;
	carbohydrate: number;
	fat: number;
}

/**
 * Calculate nutrition totals by multiplying serving nutrition by number of servings
 * and rounding appropriately (calories to nearest integer, macros to 1 decimal place)
 */
export function calculateNutritionTotal(
	servingNutrition: NutritionValues,
	numberOfServings: number,
): NutritionValues {
	return {
		calories: Math.round(servingNutrition.calories * numberOfServings),
		protein: Math.round(servingNutrition.protein * numberOfServings),
		carbohydrate: Math.round(servingNutrition.carbohydrate * numberOfServings),
		fat: Math.round(servingNutrition.fat * numberOfServings),
	};
}
