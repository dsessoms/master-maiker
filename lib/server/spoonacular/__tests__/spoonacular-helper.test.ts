import {
	getNutrition,
	convertSpoonacularToIngredient,
	convertSpoonacularExtendedIngredientToIngredient,
	convertSpoonacularRecipeToRecipe,
	THUMBNAIL_BASE_URL,
	type SpoonacularIngredient,
	type SpoonacularExtendedIngredient,
	type SpoonacularRecipeResponse,
	type NutrientInformation,
	type SpoonacularRecipeNutrition,
} from "../spoonacular-helper";

describe("Spoonacular Helper", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("getNutrition", () => {
		const mockNutrients: NutrientInformation[] = [
			{
				name: "Calories",
				amount: 200,
				unit: "kcal",
				percentOfDailyNeeds: 10,
			},
			{
				name: "Protein",
				amount: 20,
				unit: "g",
				percentOfDailyNeeds: 40,
			},
		];

		it("should return the correct nutrient when found", () => {
			const result = getNutrition(mockNutrients, "Calories");

			expect(result).toEqual({
				name: "Calories",
				amount: 200,
				unit: "kcal",
				percentOfDailyNeeds: 10,
			});
		});

		it("should return default values when nutrient is not found", () => {
			const result = getNutrition(mockNutrients, "Vitamin D");

			expect(result).toEqual({
				name: "",
				amount: 0,
				unit: "",
				percentOfDailyNeeds: 0,
			});
		});

		it("should divide amount when divideBy is provided", () => {
			const result = getNutrition(mockNutrients, "Protein", 2);

			expect(result).toEqual({
				name: "Protein",
				amount: 10,
				unit: "g",
				percentOfDailyNeeds: 20,
			});
		});

		it("should not divide when divideBy is 0", () => {
			const result = getNutrition(mockNutrients, "Protein", 0);

			expect(result).toEqual({
				name: "Protein",
				amount: 20,
				unit: "g",
				percentOfDailyNeeds: 40,
			});
		});
	});

	describe("convertSpoonacularToIngredient", () => {
		const mockSpoonacularIngredient: SpoonacularIngredient = {
			id: 123,
			aisle: "Baking",
			image: "flour.jpg",
			consistency: "solid",
			name: "flour",
			nameClean: "flour",
			original: "2 cups flour",
			originalName: "flour",
			amount: 2,
			unit: "cups",
			meta: ["all-purpose"],
			unitShort: "cups",
			unitLong: "cups",
			possibleUnits: ["cups", "g", "oz"],
			estimatedCost: {
				value: 50,
				unit: "cents",
			},
			nutrition: {
				nutrients: [
					{
						name: "Calories",
						amount: 400,
						unit: "kcal",
						percentOfDailyNeeds: 20,
					},
					{
						name: "Carbohydrates",
						amount: 80,
						unit: "g",
						percentOfDailyNeeds: 27,
					},
					{
						name: "Protein",
						amount: 12,
						unit: "g",
						percentOfDailyNeeds: 24,
					},
					{
						name: "Fat",
						amount: 2,
						unit: "g",
						percentOfDailyNeeds: 3,
					},
				],
				properties: [],
				caloricBreakdown: {
					percentProtein: 12,
					percentFat: 4,
					percentCarbs: 84,
				},
				weightPerServing: {
					amount: 120,
					unit: "g",
				},
			},
		};

		it("should convert Spoonacular ingredient to internal Ingredient format", () => {
			const result = convertSpoonacularToIngredient(mockSpoonacularIngredient);

			expect(result).toEqual({
				type: "ingredient",
				food_type: "Generic",
				name: "flour",
				original_name: "2 cups flour",
				meta: "all-purpose",
				number_of_servings: 2,
				image_url: `${THUMBNAIL_BASE_URL}flour.jpg`,
				aisle: "Baking",
				spoonacular_id: 123,
				serving: {
					measurement_description: "cups",
					serving_description: "1 cups",
					metric_serving_amount: 60, // 120 / 2
					metric_serving_unit: "g",
					number_of_units: 1,
					calories: 200, // 400 / 2
					carbohydrate_grams: 40, // 80 / 2
					fat_grams: 1, // 2 / 2
					protein_grams: 6, // 12 / 2
				},
			});
		});

		it("should handle empty meta array", () => {
			const ingredientWithoutMeta: SpoonacularIngredient = {
				...mockSpoonacularIngredient,
				meta: [],
			};

			const result = convertSpoonacularToIngredient(ingredientWithoutMeta);

			expect(result.meta).toBeNull();
		});

		it("should handle missing image", () => {
			const ingredientWithoutImage: SpoonacularIngredient = {
				...mockSpoonacularIngredient,
				image: "",
			};

			const result = convertSpoonacularToIngredient(ingredientWithoutImage);

			expect(result.image_url).toBeUndefined();
		});
	});

	describe("convertSpoonacularExtendedIngredientToIngredient", () => {
		const mockExtendedIngredient: SpoonacularExtendedIngredient = {
			id: 456,
			aisle: "Produce",
			image: "tomato.jpg",
			consistency: "solid",
			name: "tomato",
			nameClean: "tomato",
			original: "3 medium tomatoes, diced",
			originalName: "tomatoes",
			amount: 3,
			unit: "medium",
			meta: ["diced"],
			measures: {
				us: {
					amount: 3,
					unitShort: "medium",
					unitLong: "medium tomatoes",
				},
				metric: {
					amount: 360,
					unitShort: "g",
					unitLong: "grams",
				},
			},
		};

		const mockRecipeNutrition: SpoonacularRecipeNutrition = {
			nutrients: [],
			ingredients: [
				{
					id: 456,
					name: "tomato",
					amount: 3,
					unit: "medium",
					nutrients: [
						{
							name: "Calories",
							amount: 60, // per serving
							unit: "kcal",
							percentOfDailyNeeds: 3,
						},
						{
							name: "Carbohydrates",
							amount: 12,
							unit: "g",
							percentOfDailyNeeds: 4,
						},
						{
							name: "Protein",
							amount: 3,
							unit: "g",
							percentOfDailyNeeds: 6,
						},
						{
							name: "Fat",
							amount: 1,
							unit: "g",
							percentOfDailyNeeds: 2,
						},
					],
				},
			],
		};

		const recipeServings = 4;

		it("should convert extended ingredient with recipe nutrition data", () => {
			const result = convertSpoonacularExtendedIngredientToIngredient(
				mockExtendedIngredient,
				mockRecipeNutrition,
				recipeServings,
			);

			expect(result.type).toBe("ingredient");
			expect(result.name).toBe("tomato");
			expect(result.number_of_servings).toBe(3);
			expect(result.serving.measurement_description).toBe("medium");
			// Nutrition is per serving, multiply by servings then divide by amount
			// calories: 60 * 4 / 3 = 80
			expect(result.serving.calories).toBe(80);
		});

		it("should throw error when ingredient nutrition is not found", () => {
			const invalidIngredient: SpoonacularExtendedIngredient = {
				...mockExtendedIngredient,
				id: 999,
			};

			expect(() => {
				convertSpoonacularExtendedIngredientToIngredient(
					invalidIngredient,
					mockRecipeNutrition,
					recipeServings,
				);
			}).toThrow("Invalid ingredient found");
		});
	});

	describe("convertSpoonacularRecipeToRecipe", () => {
		const mockSpoonacularRecipe: SpoonacularRecipeResponse = {
			id: 789,
			image: "recipe.jpg",
			imageType: "jpg",
			title: "Test Recipe",
			readyInMinutes: 45,
			servings: 4,
			sourceUrl: "https://example.com/recipe",
			vegetarian: false,
			vegan: false,
			glutenFree: false,
			dairyFree: false,
			veryHealthy: true,
			cheap: false,
			veryPopular: true,
			sustainable: false,
			lowFodmap: false,
			weightWatcherSmartPoints: 5,
			gaps: "no",
			preparationMinutes: 15,
			cookingMinutes: 30,
			aggregateLikes: 100,
			healthScore: 75,
			creditsText: "Test Author",
			license: null,
			sourceName: "Test Source",
			pricePerServing: 250,
			extendedIngredients: [
				{
					id: 123,
					aisle: "Produce",
					image: "onion.jpg",
					consistency: "solid",
					name: "onion",
					nameClean: "onion",
					original: "1 large onion, chopped",
					originalName: "onion",
					amount: 1,
					unit: "large",
					meta: ["chopped"],
					measures: {
						us: {
							amount: 1,
							unitShort: "large",
							unitLong: "large onion",
						},
						metric: {
							amount: 150,
							unitShort: "g",
							unitLong: "grams",
						},
					},
				},
			],
			nutrition: {
				nutrients: [],
				ingredients: [
					{
						id: 123,
						name: "onion",
						amount: 1,
						unit: "large",
						nutrients: [
							{
								name: "Calories",
								amount: 40,
								unit: "kcal",
								percentOfDailyNeeds: 2,
							},
							{
								name: "Carbohydrates",
								amount: 9,
								unit: "g",
								percentOfDailyNeeds: 3,
							},
							{
								name: "Protein",
								amount: 1,
								unit: "g",
								percentOfDailyNeeds: 2,
							},
							{
								name: "Fat",
								amount: 0,
								unit: "g",
								percentOfDailyNeeds: 0,
							},
						],
					},
				],
			},
			summary: "<p>This is a <b>test recipe</b> with HTML tags.</p>",
			cuisines: ["Italian"],
			dishTypes: ["main course"],
			diets: [],
			occasions: ["dinner"],
			instructions: "Step 1. Do something. Step 2. Do something else.",
			analyzedInstructions: [
				{
					name: "",
					steps: [
						{
							number: 1,
							step: "Chop the onion",
							ingredients: [
								{
									id: 123,
									name: "onion",
									localizedName: "onion",
									image: "onion.jpg",
								},
							],
							equipment: [],
						},
						{
							number: 2,
							step: "Cook for 5 minutes",
							ingredients: [],
							equipment: [
								{
									id: 1,
									name: "pan",
									localizedName: "pan",
									image: "pan.jpg",
								},
							],
							length: {
								number: 5,
								unit: "minutes",
							},
						},
					],
				},
			],
			originalId: null,
			spoonacularScore: 85,
		};

		it("should convert Spoonacular recipe to internal Recipe format", () => {
			const result = convertSpoonacularRecipeToRecipe(mockSpoonacularRecipe);

			expect(result.name).toBe("Test Recipe");
			expect(result.description).toBe("This is a test recipe with HTML tags.");
			expect(result.servings).toBe(4);
			expect(result.ingredients).toHaveLength(1);
			expect(result.instructions).toHaveLength(2);
			expect(result.prep_time_hours).toBe(0);
			expect(result.prep_time_minutes).toBe(15);
			expect(result.cook_time_hours).toBe(0);
			expect(result.cook_time_minutes).toBe(30);
		});

		it("should handle time conversions correctly", () => {
			const recipeWithLongTimes: SpoonacularRecipeResponse = {
				...mockSpoonacularRecipe,
				preparationMinutes: 90,
				cookingMinutes: 125,
			};

			const result = convertSpoonacularRecipeToRecipe(recipeWithLongTimes);

			expect(result.prep_time_hours).toBe(1);
			expect(result.prep_time_minutes).toBe(30);
			expect(result.cook_time_hours).toBe(2);
			expect(result.cook_time_minutes).toBe(5);
		});

		it("should include section headers in instructions", () => {
			const recipeWithSections: SpoonacularRecipeResponse = {
				...mockSpoonacularRecipe,
				analyzedInstructions: [
					{
						name: "For the sauce",
						steps: [
							{
								number: 1,
								step: "Mix ingredients",
								ingredients: [],
								equipment: [],
							},
						],
					},
					{
						name: "For the main dish",
						steps: [
							{
								number: 1,
								step: "Cook the main dish",
								ingredients: [],
								equipment: [],
							},
						],
					},
				],
			};

			const result = convertSpoonacularRecipeToRecipe(recipeWithSections);

			expect(result.instructions).toHaveLength(4);
			expect(result.instructions![0]).toEqual({
				type: "header",
				name: "For the sauce",
			});
			expect(result.instructions![1]).toEqual({
				type: "instruction",
				value: "Mix ingredients",
			});
			expect(result.instructions![2]).toEqual({
				type: "header",
				name: "For the main dish",
			});
			expect(result.instructions![3]).toEqual({
				type: "instruction",
				value: "Cook the main dish",
			});
		});

		it("should not include empty section headers", () => {
			const result = convertSpoonacularRecipeToRecipe(mockSpoonacularRecipe);

			// Should only have instructions, no header since section name is empty
			expect(result.instructions![0].type).toBe("instruction");
		});
	});
});
