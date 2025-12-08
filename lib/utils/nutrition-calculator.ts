import { FoodEntry } from "@/app/api/food-entries/index+api";

export interface NutritionTotals {
	calories: number;
	protein: number;
	carbohydrate: number;
	fat: number;
}

/**
 * Calculate nutrition totals for a single food entry for a specific profile
 */
export function calculateFoodEntryNutrition(
	entry: FoodEntry,
	profileId: string,
): NutritionTotals {
	// Find the profile's servings
	const profileEntry = entry.profile_food_entry.find(
		(pfe) => pfe.profile_id === profileId,
	);

	if (!profileEntry || profileEntry.number_of_servings === 0) {
		return { calories: 0, protein: 0, carbohydrate: 0, fat: 0 };
	}

	const numberOfServings = profileEntry.number_of_servings;

	// For Recipe type entries
	if (entry.type === "Recipe" && entry.recipe) {
		const macros = entry.recipe.macros?.[0];
		if (!macros) {
			return { calories: 0, protein: 0, carbohydrate: 0, fat: 0 };
		}

		// Recipe macros are already per serving, so just multiply by number of servings
		return {
			calories: Math.round((macros.calories || 0) * numberOfServings),
			protein: Math.round((macros.protein || 0) * numberOfServings * 10) / 10,
			carbohydrate:
				Math.round((macros.carbohydrate || 0) * numberOfServings * 10) / 10,
			fat: Math.round((macros.fat || 0) * numberOfServings * 10) / 10,
		};
	}

	// For Food type entries
	if (entry.type === "Food" && entry.serving) {
		return {
			calories: Math.round(entry.serving.calories * numberOfServings),
			protein: Math.round(entry.serving.protein * numberOfServings * 10) / 10,
			carbohydrate:
				Math.round(entry.serving.carbohydrate * numberOfServings * 10) / 10,
			fat: Math.round(entry.serving.fat * numberOfServings * 10) / 10,
		};
	}

	return { calories: 0, protein: 0, carbohydrate: 0, fat: 0 };
}

/**
 * Calculate nutrition totals for all selected profiles in a food entry
 */
export function calculateFoodEntryNutritionForSelectedProfiles(
	entry: FoodEntry,
	selectedProfileIds: Set<string>,
): NutritionTotals {
	const totals: NutritionTotals = {
		calories: 0,
		protein: 0,
		carbohydrate: 0,
		fat: 0,
	};

	// Sum up nutrition for all selected profiles
	entry.profile_food_entry.forEach((pfe) => {
		if (selectedProfileIds.has(pfe.profile_id) && pfe.number_of_servings > 0) {
			const profileNutrition = calculateFoodEntryNutrition(
				entry,
				pfe.profile_id,
			);
			totals.calories += profileNutrition.calories;
			totals.protein += profileNutrition.protein;
			totals.carbohydrate += profileNutrition.carbohydrate;
			totals.fat += profileNutrition.fat;
		}
	});

	// Round final totals
	totals.protein = Math.round(totals.protein * 10) / 10;
	totals.carbohydrate = Math.round(totals.carbohydrate * 10) / 10;
	totals.fat = Math.round(totals.fat * 10) / 10;

	return totals;
}

/**
 * Calculate nutrition totals for an array of food entries (e.g., all entries in a meal type)
 */
export function calculateFoodEntriesNutrition(
	entries: FoodEntry[],
	selectedProfileIds: Set<string>,
): NutritionTotals {
	const totals: NutritionTotals = {
		calories: 0,
		protein: 0,
		carbohydrate: 0,
		fat: 0,
	};

	if (!entries || entries.length === 0) {
		return totals;
	}

	entries.forEach((entry) => {
		const entryNutrition = calculateFoodEntryNutritionForSelectedProfiles(
			entry,
			selectedProfileIds,
		);
		totals.calories += entryNutrition.calories;
		totals.protein += entryNutrition.protein;
		totals.carbohydrate += entryNutrition.carbohydrate;
		totals.fat += entryNutrition.fat;
	});

	// Round final totals
	totals.protein = Math.round(totals.protein * 10) / 10;
	totals.carbohydrate = Math.round(totals.carbohydrate * 10) / 10;
	totals.fat = Math.round(totals.fat * 10) / 10;

	return totals;
}
