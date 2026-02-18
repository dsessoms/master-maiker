import { Ingredient, Recipe } from "../../schemas/recipes/recipe-schema";

import { SpoonacularAnalyzeRecipe } from "@/lib/schemas";
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
	divideBy?: number,
): NutrientInformation => {
	const base = {
		name: "",
		amount: 0,
		unit: "",
		percentOfDailyNeeds: 0,
	};
	const nutrition = nutrients.find((nutrient) => nutrient.name === name);
	const result = { ...base, ...nutrition };

	// Divide amount if divideBy is provided and greater than 0
	if (divideBy && divideBy > 0) {
		result.amount = result.amount / divideBy;
		result.percentOfDailyNeeds = result.percentOfDailyNeeds / divideBy;
	}

	return result;
};

export const convertSpoonacularToIngredient = (
	spoonacularIngredient: SpoonacularIngredient,
): Ingredient => {
	const { nutrition } = spoonacularIngredient;
	const amount = spoonacularIngredient.amount;

	// Nutrition values are for the total amount, so divide by amount to get per unit
	const calories = getNutrition(nutrition.nutrients, "Calories", amount).amount;
	const carbs = getNutrition(
		nutrition.nutrients,
		"Carbohydrates",
		amount,
	).amount;
	const fat = getNutrition(nutrition.nutrients, "Fat", amount).amount;
	const protein = getNutrition(nutrition.nutrients, "Protein", amount).amount;
	const sugar = getNutrition(nutrition.nutrients, "Sugar", amount).amount;
	const sodium = getNutrition(nutrition.nutrients, "Sodium", amount).amount;
	const fiber = getNutrition(nutrition.nutrients, "Fiber", amount).amount;
	const potassium = getNutrition(
		nutrition.nutrients,
		"Potassium",
		amount,
	).amount;
	const vitaminD = getNutrition(
		nutrition.nutrients,
		"Vitamin D",
		amount,
	).amount;
	const vitaminA = getNutrition(
		nutrition.nutrients,
		"Vitamin A",
		amount,
	).amount;
	const vitaminC = getNutrition(
		nutrition.nutrients,
		"Vitamin C",
		amount,
	).amount;
	const calcium = getNutrition(nutrition.nutrients, "Calcium", amount).amount;
	const iron = getNutrition(nutrition.nutrients, "Iron", amount).amount;
	const transFat = getNutrition(
		nutrition.nutrients,
		"Trans Fat",
		amount,
	).amount;
	const cholesterol = getNutrition(
		nutrition.nutrients,
		"Cholesterol",
		amount,
	).amount;
	const saturatedFat = getNutrition(
		nutrition.nutrients,
		"Saturated Fat",
		amount,
	).amount;
	const polyunsaturatedFat = getNutrition(
		nutrition.nutrients,
		"Poly Unsaturated Fat",
		amount,
	).amount;
	const monounsaturatedFat = getNutrition(
		nutrition.nutrients,
		"Mono Unsaturated Fat",
		amount,
	).amount;

	return {
		type: "ingredient",
		food_type: "Generic",
		name: spoonacularIngredient.name,
		original_name: spoonacularIngredient.original,
		meta:
			spoonacularIngredient.meta.length > 0
				? spoonacularIngredient.meta.join(", ")
				: null,
		number_of_servings: amount,
		image_url: spoonacularIngredient.image
			? `${THUMBNAIL_BASE_URL}${spoonacularIngredient.image}`
			: undefined,
		aisle: spoonacularIngredient.aisle,
		spoonacular_id: spoonacularIngredient.id,
		serving: {
			measurement_description:
				spoonacularIngredient.unitLong || spoonacularIngredient.unit,
			serving_description: `1 ${spoonacularIngredient.unitLong || spoonacularIngredient.unit}`,
			metric_serving_amount:
				spoonacularIngredient.nutrition.weightPerServing.amount / amount,
			metric_serving_unit:
				spoonacularIngredient.nutrition.weightPerServing.unit,
			number_of_units: 1,
			calories,
			carbohydrate_grams: carbs,
			fat_grams: fat,
			protein_grams: protein,
			sugar_grams: sugar || undefined,
			sodium_mg: sodium || undefined,
			fiber_grams: fiber || undefined,
			potassium_mg: potassium || undefined,
			vitamin_d_mcg: vitaminD || undefined,
			vitamin_a_mcg: vitaminA || undefined,
			vitamin_c_mg: vitaminC || undefined,
			calcium_mg: calcium || undefined,
			iron_mg: iron || undefined,
			trans_fat_grams: transFat || undefined,
			cholesterol_mg: cholesterol || undefined,
			saturated_fat_grams: saturatedFat || undefined,
			polyunsaturated_fat_grams: polyunsaturatedFat || undefined,
			monounsaturated_fat_grams: monounsaturatedFat || undefined,
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

	const amount = extendedIngredient.amount;

	// Nutrition values are per serving, multiply by recipe servings to get total,
	// then divide by ingredient amount to get per unit
	const divideBy = amount / recipeServings;
	const calories = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Calories", divideBy).amount
		: 0;
	const carbs = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Carbohydrates", divideBy)
				.amount
		: 0;
	const fat = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Fat", divideBy).amount
		: 0;
	const protein = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Protein", divideBy).amount
		: 0;
	const sugar = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Sugar", divideBy).amount
		: 0;
	const sodium = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Sodium", divideBy).amount
		: 0;
	const fiber = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Fiber", divideBy).amount
		: 0;
	const potassium = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Potassium", divideBy).amount
		: 0;
	const vitaminD = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Vitamin D", divideBy).amount
		: 0;
	const vitaminA = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Vitamin A", divideBy).amount
		: 0;
	const vitaminC = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Vitamin C", divideBy).amount
		: 0;
	const calcium = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Calcium", divideBy).amount
		: 0;
	const iron = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Iron", divideBy).amount
		: 0;
	const transFat = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Trans Fat", divideBy).amount
		: 0;
	const cholesterol = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Cholesterol", divideBy)
				.amount
		: 0;
	const saturatedFat = ingredientNutrition
		? getNutrition(ingredientNutrition.nutrients, "Saturated Fat", divideBy)
				.amount
		: 0;
	const polyunsaturatedFat = ingredientNutrition
		? getNutrition(
				ingredientNutrition.nutrients,
				"Poly Unsaturated Fat",
				divideBy,
			).amount
		: 0;
	const monounsaturatedFat = ingredientNutrition
		? getNutrition(
				ingredientNutrition.nutrients,
				"Mono Unsaturated Fat",
				divideBy,
			).amount
		: 0;

	return {
		type: "ingredient",
		food_type: "Generic",
		name: extendedIngredient.nameClean || extendedIngredient.name,
		original_name: extendedIngredient.original,
		meta:
			extendedIngredient.meta.length > 0
				? extendedIngredient.meta.join(", ")
				: null,
		number_of_servings: extendedIngredient.amount,
		image_url: extendedIngredient.image
			? `${THUMBNAIL_BASE_URL}${extendedIngredient.image}`
			: undefined,
		aisle: extendedIngredient.aisle,
		spoonacular_id: extendedIngredient.id,
		serving: {
			measurement_description:
				extendedIngredient.measures.us.unitLong ||
				extendedIngredient.measures.us.unitShort ||
				extendedIngredient.unit,
			serving_description: `1 ${
				extendedIngredient.measures.us.unitLong ||
				extendedIngredient.measures.us.unitShort ||
				extendedIngredient.unit
			}`,
			metric_serving_amount: nutrition.weightPerServing.amount / divideBy,
			metric_serving_unit: nutrition.weightPerServing.unit,
			number_of_units: 1,
			calories,
			carbohydrate_grams: carbs,
			fat_grams: fat,
			protein_grams: protein,
			sugar_grams: sugar || undefined,
			sodium_mg: sodium || undefined,
			fiber_grams: fiber || undefined,
			potassium_mg: potassium || undefined,
			vitamin_d_mcg: vitaminD || undefined,
			vitamin_a_mcg: vitaminA || undefined,
			vitamin_c_mg: vitaminC || undefined,
			calcium_mg: calcium || undefined,
			iron_mg: iron || undefined,
			trans_fat_grams: transFat || undefined,
			cholesterol_mg: cholesterol || undefined,
			saturated_fat_grams: saturatedFat || undefined,
			polyunsaturated_fat_grams: polyunsaturatedFat || undefined,
			monounsaturated_fat_grams: monounsaturatedFat || undefined,
		},
	};
};

export const convertSpoonacularRecipeToRecipe = (
	spoonacularRecipe: SpoonacularRecipeResponse,
): Recipe => {
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

		// Determine content type based on body type
		const isFormData = typeof body === "string";
		const contentType = isFormData
			? "application/x-www-form-urlencoded"
			: "application/json";

		try {
			const response = await axios({
				method: httpMethod.toLowerCase() as any,
				url: `${API_PATH}/${endpoint}`,
				params: queryParamsWithApiKey,
				data: httpMethod !== "GET" ? body : undefined,
				headers: {
					"Content-Type": httpMethod !== "GET" ? contentType : undefined,
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

	/**
	 * Search for recipes using a variety of filters and constraints
	 * @param params - Search parameters
	 * @param params.query - The (natural language) recipe search query
	 * @param params.cuisine - The cuisine(s) of the recipes. One or more, comma separated (will be interpreted as 'OR')
	 * @param params.excludeCuisine - The cuisine(s) the recipes must not match. One or more, comma separated (will be interpreted as 'AND')
	 * @param params.diet - The diet(s) for which the recipes must be suitable. Comma means AND, pipe | means OR. Example: "gluten free,vegetarian" or "vegan|vegetarian"
	 * @param params.intolerances - A comma-separated list of intolerances. All recipes returned must not contain ingredients that are not suitable for people with the intolerances entered
	 * @param params.equipment - The equipment required. Multiple values will be interpreted as 'or'. Example: "blender, frying pan, bowl"
	 * @param params.includeIngredients - A comma-separated list of ingredients that should/must be used in the recipes
	 * @param params.excludeIngredients - A comma-separated list of ingredients or ingredient types that the recipes must not contain
	 * @param params.type - The type of recipe (e.g., "main course", "dessert", "appetizer")
	 * @param params.instructionsRequired - Whether the recipes must have instructions
	 * @param params.fillIngredients - Add information about the ingredients and whether they are used or missing in relation to the query
	 * @param params.addRecipeInformation - If set to true, you get more information about the recipes returned
	 * @param params.addRecipeInstructions - If set to true, you get analyzed instructions for each recipe returned
	 * @param params.addRecipeNutrition - If set to true, you get nutritional information about each recipe returned
	 * @param params.author - The username of the recipe author
	 * @param params.tags - User defined tags that have to match. The author param has to be set
	 * @param params.recipeBoxId - The id of the recipe box to which the search should be limited to
	 * @param params.titleMatch - Enter text that must be found in the title of the recipes
	 * @param params.maxReadyTime - The maximum time in minutes it should take to prepare and cook the recipe
	 * @param params.minServings - The minimum amount of servings the recipe is for
	 * @param params.maxServings - The maximum amount of servings the recipe is for
	 * @param params.ignorePantry - Whether to ignore typical pantry items, such as water, salt, flour, etc.
	 * @param params.sort - The strategy to sort recipes by (e.g., "calories", "time", "popularity")
	 * @param params.sortDirection - The direction in which to sort. Must be either 'asc' (ascending) or 'desc' (descending)
	 * @param params.minCarbs - The minimum amount of carbohydrates in grams the recipe must have per serving
	 * @param params.maxCarbs - The maximum amount of carbohydrates in grams the recipe can have per serving
	 * @param params.minProtein - The minimum amount of protein in grams the recipe must have per serving
	 * @param params.maxProtein - The maximum amount of protein in grams the recipe can have per serving
	 * @param params.minCalories - The minimum amount of calories the recipe must have per serving
	 * @param params.maxCalories - The maximum amount of calories the recipe can have per serving
	 * @param params.minFat - The minimum amount of fat in grams the recipe must have per serving
	 * @param params.maxFat - The maximum amount of fat in grams the recipe can have per serving
	 * @param params.minAlcohol - The minimum amount of alcohol in grams the recipe must have per serving
	 * @param params.maxAlcohol - The maximum amount of alcohol in grams the recipe can have per serving
	 * @param params.minCaffeine - The minimum amount of caffeine in milligrams the recipe must have per serving
	 * @param params.maxCaffeine - The maximum amount of caffeine in milligrams the recipe can have per serving
	 * @param params.minCopper - The minimum amount of copper in milligrams the recipe must have per serving
	 * @param params.maxCopper - The maximum amount of copper in milligrams the recipe can have per serving
	 * @param params.minCalcium - The minimum amount of calcium in milligrams the recipe must have per serving
	 * @param params.maxCalcium - The maximum amount of calcium in milligrams the recipe can have per serving
	 * @param params.minCholine - The minimum amount of choline in milligrams the recipe must have per serving
	 * @param params.maxCholine - The maximum amount of choline in milligrams the recipe can have per serving
	 * @param params.minCholesterol - The minimum amount of cholesterol in milligrams the recipe must have per serving
	 * @param params.maxCholesterol - The maximum amount of cholesterol in milligrams the recipe can have per serving
	 * @param params.minFluoride - The minimum amount of fluoride in milligrams the recipe must have per serving
	 * @param params.maxFluoride - The maximum amount of fluoride in milligrams the recipe can have per serving
	 * @param params.minSaturatedFat - The minimum amount of saturated fat in grams the recipe must have per serving
	 * @param params.maxSaturatedFat - The maximum amount of saturated fat in grams the recipe can have per serving
	 * @param params.minVitaminA - The minimum amount of Vitamin A in IU the recipe must have per serving
	 * @param params.maxVitaminA - The maximum amount of Vitamin A in IU the recipe can have per serving
	 * @param params.minVitaminC - The minimum amount of Vitamin C in milligrams the recipe must have per serving
	 * @param params.maxVitaminC - The maximum amount of Vitamin C in milligrams the recipe can have per serving
	 * @param params.minVitaminD - The minimum amount of Vitamin D in micrograms the recipe must have per serving
	 * @param params.maxVitaminD - The maximum amount of Vitamin D in micrograms the recipe can have per serving
	 * @param params.minVitaminE - The minimum amount of Vitamin E in milligrams the recipe must have per serving
	 * @param params.maxVitaminE - The maximum amount of Vitamin E in milligrams the recipe can have per serving
	 * @param params.minVitaminK - The minimum amount of Vitamin K in micrograms the recipe must have per serving
	 * @param params.maxVitaminK - The maximum amount of Vitamin K in micrograms the recipe can have per serving
	 * @param params.minVitaminB1 - The minimum amount of Vitamin B1 in milligrams the recipe must have per serving
	 * @param params.maxVitaminB1 - The maximum amount of Vitamin B1 in milligrams the recipe can have per serving
	 * @param params.minVitaminB2 - The minimum amount of Vitamin B2 in milligrams the recipe must have per serving
	 * @param params.maxVitaminB2 - The maximum amount of Vitamin B2 in milligrams the recipe can have per serving
	 * @param params.minVitaminB5 - The minimum amount of Vitamin B5 in milligrams the recipe must have per serving
	 * @param params.maxVitaminB5 - The maximum amount of Vitamin B5 in milligrams the recipe can have per serving
	 * @param params.minVitaminB3 - The minimum amount of Vitamin B3 in milligrams the recipe must have per serving
	 * @param params.maxVitaminB3 - The maximum amount of Vitamin B3 in milligrams the recipe can have per serving
	 * @param params.minVitaminB6 - The minimum amount of Vitamin B6 in milligrams the recipe must have per serving
	 * @param params.maxVitaminB6 - The maximum amount of Vitamin B6 in milligrams the recipe can have per serving
	 * @param params.minVitaminB12 - The minimum amount of Vitamin B12 in micrograms the recipe must have per serving
	 * @param params.maxVitaminB12 - The maximum amount of Vitamin B12 in micrograms the recipe can have per serving
	 * @param params.minFiber - The minimum amount of fiber in grams the recipe must have per serving
	 * @param params.maxFiber - The maximum amount of fiber in grams the recipe can have per serving
	 * @param params.minFolate - The minimum amount of folate in micrograms the recipe must have per serving
	 * @param params.maxFolate - The maximum amount of folate in micrograms the recipe can have per serving
	 * @param params.minFolicAcid - The minimum amount of folic acid in micrograms the recipe must have per serving
	 * @param params.maxFolicAcid - The maximum amount of folic acid in micrograms the recipe can have per serving
	 * @param params.minIodine - The minimum amount of iodine in micrograms the recipe must have per serving
	 * @param params.maxIodine - The maximum amount of iodine in micrograms the recipe can have per serving
	 * @param params.minIron - The minimum amount of iron in milligrams the recipe must have per serving
	 * @param params.maxIron - The maximum amount of iron in milligrams the recipe can have per serving
	 * @param params.minMagnesium - The minimum amount of magnesium in milligrams the recipe must have per serving
	 * @param params.maxMagnesium - The maximum amount of magnesium in milligrams the recipe can have per serving
	 * @param params.minManganese - The minimum amount of manganese in milligrams the recipe must have per serving
	 * @param params.maxManganese - The maximum amount of manganese in milligrams the recipe can have per serving
	 * @param params.minPhosphorus - The minimum amount of phosphorus in milligrams the recipe must have per serving
	 * @param params.maxPhosphorus - The maximum amount of phosphorus in milligrams the recipe can have per serving
	 * @param params.minPotassium - The minimum amount of potassium in milligrams the recipe must have per serving
	 * @param params.maxPotassium - The maximum amount of potassium in milligrams the recipe can have per serving
	 * @param params.minSelenium - The minimum amount of selenium in micrograms the recipe must have per serving
	 * @param params.maxSelenium - The maximum amount of selenium in micrograms the recipe can have per serving
	 * @param params.minSodium - The minimum amount of sodium in milligrams the recipe must have per serving
	 * @param params.maxSodium - The maximum amount of sodium in milligrams the recipe can have per serving
	 * @param params.minSugar - The minimum amount of sugar in grams the recipe must have per serving
	 * @param params.maxSugar - The maximum amount of sugar in grams the recipe can have per serving
	 * @param params.minZinc - The minimum amount of zinc in milligrams the recipe must have per serving
	 * @param params.maxZinc - The maximum amount of zinc in milligrams the recipe can have per serving
	 * @param params.offset - The number of results to skip (between 0 and 900)
	 * @param params.number - The number of expected results (between 1 and 100)
	 * @returns Promise resolving to the search results
	 */
	static searchRecipes(params: {
		query?: string;
		cuisine?: string;
		excludeCuisine?: string;
		diet?: string;
		intolerances?: string;
		equipment?: string;
		includeIngredients?: string;
		excludeIngredients?: string;
		type?: string;
		instructionsRequired?: boolean;
		fillIngredients?: boolean;
		addRecipeInformation?: boolean;
		addRecipeInstructions?: boolean;
		author?: string;
		tags?: string;
		recipeBoxId?: number;
		titleMatch?: string;
		maxReadyTime?: number;
		minServings?: number;
		maxServings?: number;
		ignorePantry?: boolean;
		sort?: string;
		sortDirection?: string;
		minCarbs?: number;
		maxCarbs?: number;
		minProtein?: number;
		maxProtein?: number;
		minCalories?: number;
		maxCalories?: number;
		minFat?: number;
		maxFat?: number;
		minAlcohol?: number;
		maxAlcohol?: number;
		minCaffeine?: number;
		maxCaffeine?: number;
		minCopper?: number;
		maxCopper?: number;
		minCalcium?: number;
		maxCalcium?: number;
		minCholine?: number;
		maxCholine?: number;
		minCholesterol?: number;
		maxCholesterol?: number;
		minFluoride?: number;
		maxFluoride?: number;
		minSaturatedFat?: number;
		maxSaturatedFat?: number;
		minVitaminA?: number;
		maxVitaminA?: number;
		minVitaminC?: number;
		maxVitaminC?: number;
		minVitaminD?: number;
		maxVitaminD?: number;
		minVitaminE?: number;
		maxVitaminE?: number;
		minVitaminK?: number;
		maxVitaminK?: number;
		minVitaminB1?: number;
		maxVitaminB1?: number;
		minVitaminB2?: number;
		maxVitaminB2?: number;
		minVitaminB5?: number;
		maxVitaminB5?: number;
		minVitaminB3?: number;
		maxVitaminB3?: number;
		minVitaminB6?: number;
		maxVitaminB6?: number;
		minVitaminB12?: number;
		maxVitaminB12?: number;
		minFiber?: number;
		maxFiber?: number;
		minFolate?: number;
		maxFolate?: number;
		minFolicAcid?: number;
		maxFolicAcid?: number;
		minIodine?: number;
		maxIodine?: number;
		minIron?: number;
		maxIron?: number;
		minMagnesium?: number;
		maxMagnesium?: number;
		minManganese?: number;
		maxManganese?: number;
		minPhosphorus?: number;
		maxPhosphorus?: number;
		minPotassium?: number;
		maxPotassium?: number;
		minSelenium?: number;
		maxSelenium?: number;
		minSodium?: number;
		maxSodium?: number;
		minSugar?: number;
		maxSugar?: number;
		minZinc?: number;
		maxZinc?: number;
		offset?: number;
		number?: number;
	}): Promise<Response> {
		return this.makeApiCall("recipes/complexSearch", {
			...params,
			addRecipeNutrition: true,
		});
	}

	static getRecipeInformation(params: {
		id: string;
	}): Promise<SpoonacularRecipeResponse> {
		return this.makeApiCall(`recipes/${params.id}/information`, {
			includeNutrition: true,
		});
	}

	static getRecipeInformationBulk(params: {
		ids: string[];
	}): Promise<SpoonacularRecipeResponse[]> {
		return this.makeApiCall("recipes/informationBulk", {
			ids: params.ids.join(","),
			includeNutrition: true,
		});
	}

	static parseRecipeFromWebsite(params: {
		url: string;
	}): Promise<SpoonacularRecipeResponse> {
		return this.makeApiCall("recipes/extract", {
			...params,
			includeNutrition: true,
		});
	}

	static analyzeRecipe(params: {
		recipe: SpoonacularAnalyzeRecipe;
	}): Promise<SpoonacularRecipeResponse> {
		// Send JSON data instead of form-encoded for analyze endpoint
		return this.makeApiCall(
			"recipes/analyze",
			{
				includeNutrition: true,
			},
			params.recipe,
			"POST",
		);
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
