import { Ingredient, Recipe } from "../../schemas/recipe-schema";

import axios from "axios";

const API_PATH = "https://api.spoonacular.com";
export const THUMBNAIL_BASE_URL =
	"https://spoonacular.com/cdn/ingredients_100x100/";
export const MEDIUM_BASE_URL =
	"https://spoonacular.com/cdn/ingredients_250x250/";
export const LARGE_BASE_URL =
	"https://spoonacular.com/cdn/ingredients_500x500/";

const API_KEY = process.env.SPOONACULAR_API_KEY as string;

export interface NutrientInformation {
	name: string;
	amount: number;
	unit: string;
	percentOfDailyNeeds: number;
}

export interface SpoonacularIngredient {
	id: number;
	original: string;
	originalName: string;
	name: string;
	nameClean: string;
	amount: number;
	unit: string;
	unitShort: string;
	unitLong: string;
	possibleUnits: string[];
	estimatedCost: {
		value: number;
		unit: string;
	};
	consistency: string;
	aisle: string;
	image: string;
	meta: string[];
	nutrition: {
		nutrients: NutrientInformation[];
		properties: {
			name: string;
			amount: number;
			unit: string;
		}[];
		caloricBreakdown: {
			percentProtein: number;
			percentFat: number;
			percentCarbs: number;
		};
		weightPerServing: {
			amount: number;
			unit: "g";
		};
	};
}

export interface SpoonacularMeasures {
	us: {
		amount: number;
		unitShort: string;
		unitLong: string;
	};
	metric: {
		amount: number;
		unitShort: string;
		unitLong: string;
	};
}

export interface SpoonacularExtendedIngredient {
	id: number;
	aisle: string;
	image: string;
	consistency: string;
	name: string;
	nameClean: string;
	original: string;
	originalName: string;
	amount: number;
	unit: string;
	meta: string[];
	measures: SpoonacularMeasures;
}

export interface SpoonacularNutrition {
	nutrients: NutrientInformation[];
	properties: {
		name: string;
		amount: number;
		unit: string;
	}[];
	flavonoids: {
		name: string;
		amount: number;
		unit: string;
	}[];
	ingredients: {
		id: number;
		name: string;
		amount: number;
		unit: string;
		nutrients: NutrientInformation[];
	}[];
	caloricBreakdown: {
		percentProtein: number;
		percentFat: number;
		percentCarbs: number;
	};
	weightPerServing: {
		amount: number;
		unit: string;
	};
}

export interface SpoonacularInstructionStep {
	number: number;
	step: string;
	ingredients: {
		id: number;
		name: string;
		localizedName: string;
		image: string;
	}[];
	equipment: {
		id: number;
		name: string;
		localizedName: string;
		image: string;
		temperature?: {
			number: number;
			unit: string;
		};
	}[];
	length?: {
		number: number;
		unit: string;
	};
}

export interface SpoonacularInstructionSection {
	name: string;
	steps: SpoonacularInstructionStep[];
}

export interface SpoonacularRecipeResponse {
	id: number;
	image: string;
	imageType: string;
	title: string;
	readyInMinutes: number;
	servings: number;
	sourceUrl: string;
	vegetarian: boolean;
	vegan: boolean;
	glutenFree: boolean;
	dairyFree: boolean;
	veryHealthy: boolean;
	cheap: boolean;
	veryPopular: boolean;
	sustainable: boolean;
	lowFodmap: boolean;
	weightWatcherSmartPoints: number;
	gaps: string;
	preparationMinutes: number;
	cookingMinutes: number;
	aggregateLikes: number;
	healthScore: number;
	creditsText: string;
	license: string | null;
	sourceName: string;
	pricePerServing: number;
	extendedIngredients: SpoonacularExtendedIngredient[];
	nutrition: SpoonacularNutrition;
	summary: string;
	cuisines: string[];
	dishTypes: string[];
	diets: string[];
	occasions: string[];
	instructions: string;
	analyzedInstructions: SpoonacularInstructionSection[];
	originalId: number | null;
	spoonacularScore: number;
}

export const getNutrition = (
	nutrients: NutrientInformation[],
	name: string,
): NutrientInformation => {
	const base = {
		name: "",
		amount: 0,
		unit: "",
		percentOfDailyNeeds: 0,
	};
	const nutrition = nutrients.find((nutrient) => nutrient.name === name);
	return { ...base, ...nutrition };
};

export const convertSpoonacularToIngredient = (
	spoonacularIngredient: SpoonacularIngredient,
): Ingredient => {
	const { nutrition } = spoonacularIngredient;
	const calories = getNutrition(nutrition.nutrients, "Calories").amount;
	const carbs = getNutrition(nutrition.nutrients, "Carbohydrates").amount;
	const fat = getNutrition(nutrition.nutrients, "Fat").amount;
	const protein = getNutrition(nutrition.nutrients, "Protein").amount;

	return {
		type: "ingredient",
		name: spoonacularIngredient.name,
		meta:
			spoonacularIngredient.meta.length > 0
				? spoonacularIngredient.meta.join(", ")
				: null,
		number_of_servings: 1,
		image_url: spoonacularIngredient.image
			? `${THUMBNAIL_BASE_URL}${spoonacularIngredient.image}`
			: undefined,
		spoonacular_id: spoonacularIngredient.id, // Add spoonacular food ID
		serving: {
			measurement_description:
				spoonacularIngredient.unitLong || spoonacularIngredient.unit,
			serving_description: `${spoonacularIngredient.amount} ${spoonacularIngredient.unitLong || spoonacularIngredient.unit}`,
			metric_serving_amount:
				spoonacularIngredient.nutrition.weightPerServing.amount,
			metric_serving_unit:
				spoonacularIngredient.nutrition.weightPerServing.unit,
			number_of_units: spoonacularIngredient.amount,
			calories,
			carbohydrate_grams: carbs,
			fat_grams: fat,
			protein_grams: protein,
		},
	};
};

export const convertSpoonacularExtendedIngredientToIngredient = (
	extendedIngredient: SpoonacularExtendedIngredient,
	nutrition: SpoonacularNutrition,
	recipeServings: number,
): Ingredient => {
	// Find nutrition info for this specific ingredient
	const ingredientNutrition = nutrition.ingredients.find(
		(ing) => ing.id === extendedIngredient.id,
	);

	const calories = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Calories").amount *
			recipeServings
		: 0;
	const carbs = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Carbohydrates").amount *
			recipeServings
		: 0;
	const fat = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Fat").amount * recipeServings
		: 0;
	const protein = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Protein").amount *
			recipeServings
		: 0;

	return {
		type: "ingredient",
		name: extendedIngredient.nameClean || extendedIngredient.name,
		meta:
			extendedIngredient.meta.length > 0
				? extendedIngredient.meta.join(", ")
				: null,
		number_of_servings: 1,
		image_url: extendedIngredient.image
			? `${THUMBNAIL_BASE_URL}${extendedIngredient.image}`
			: undefined,
		spoonacular_id: extendedIngredient.id,
		serving: {
			measurement_description:
				extendedIngredient.measures.us.unitLong ||
				extendedIngredient.measures.us.unitShort ||
				extendedIngredient.unit,
			serving_description: `${extendedIngredient.amount} ${
				extendedIngredient.measures.us.unitLong ||
				extendedIngredient.measures.us.unitShort ||
				extendedIngredient.unit
			}`,
			metric_serving_amount: extendedIngredient.measures.metric.amount,
			metric_serving_unit: extendedIngredient.measures.metric.unitShort,
			number_of_units: extendedIngredient.amount,
			calories,
			carbohydrate_grams: carbs,
			fat_grams: fat,
			protein_grams: protein,
		},
	};
};

export const convertSpoonacularRecipeToRecipe = (
	spoonacularRecipe: SpoonacularRecipeResponse,
): Recipe => {
	// Convert ingredients
	const ingredients = spoonacularRecipe.extendedIngredients.map((ingredient) =>
		convertSpoonacularExtendedIngredientToIngredient(
			ingredient,
			spoonacularRecipe.nutrition,
			spoonacularRecipe.servings,
		),
	);

	// Convert instructions
	const instructions = spoonacularRecipe.analyzedInstructions.flatMap(
		(section) => {
			const sectionInstructions = section.steps.map((step) => ({
				type: "instruction" as const,
				value: step.step,
			}));

			// Add section header if it has a name
			if (section.name && section.name.trim()) {
				return [
					{
						type: "header" as const,
						name: section.name,
					},
					...sectionInstructions,
				];
			}

			return sectionInstructions;
		},
	);

	// Calculate prep and cook times
	const prepTimeMinutes = spoonacularRecipe.preparationMinutes || 0;
	const cookTimeMinutes = spoonacularRecipe.cookingMinutes || 0;

	return {
		name: spoonacularRecipe.title,
		description: spoonacularRecipe.summary
			? spoonacularRecipe.summary.replace(/<[^>]*>/g, "") // Strip HTML tags
			: "",
		servings: spoonacularRecipe.servings,
		ingredients,
		instructions,
		prep_time_hours: Math.floor(prepTimeMinutes / 60),
		prep_time_minutes: prepTimeMinutes % 60,
		cook_time_hours: Math.floor(cookTimeMinutes / 60),
		cook_time_minutes: cookTimeMinutes % 60,
	};
};

export class Spoonacular {
	static async makeApiCall(
		endpoint: string,
		queryParams: object = {},
		body: any = {},
		httpMethod = "GET",
	): Promise<any> {
		const queryParamsWithApiKey = {
			apiKey: API_KEY,
			...queryParams,
		};

		try {
			const response = await axios({
				method: httpMethod.toLowerCase() as any,
				url: `${API_PATH}/${endpoint}`,
				params: queryParamsWithApiKey,
				data: httpMethod !== "GET" ? body : undefined,
				headers: {
					"Content-Type":
						httpMethod !== "GET"
							? "application/x-www-form-urlencoded"
							: undefined,
				},
			});
			return response.data;
		} catch (error) {
			console.error("Spoonacular API error:", error);
			throw error;
		}
	}

	static getRandomRecipes(): Promise<Response> {
		return this.makeApiCall("recipes/random");
	}

	static parseRecipeFromWebsite(params: {
		url: string;
	}): Promise<SpoonacularRecipeResponse> {
		return this.makeApiCall("recipes/extract", {
			...params,
			includeNutrition: true,
		});
	}

	static parseIngredients(params: {
		ingredientList: string;
	}): Promise<SpoonacularIngredient[]> {
		// Format data as form-encoded string for POST requests
		const formData = new URLSearchParams({
			servings: "1",
			includeNutrition: "true",
			...params,
		});

		return this.makeApiCall(
			"recipes/parseIngredients",
			{},
			formData.toString(),
			"POST",
		);
	}
}

// Example usage:
// const spoonacularRecipe = await Spoonacular.parseRecipeFromWebsite({ url: "https://example.com/recipe" });
// const recipe = convertSpoonacularRecipeToRecipe(spoonacularRecipe);
