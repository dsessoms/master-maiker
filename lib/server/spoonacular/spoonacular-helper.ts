import axios from "axios";
import { Ingredient } from "../../schemas/recipe-schema";
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
