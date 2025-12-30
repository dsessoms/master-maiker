import {
	GeneratedMealPlan,
	GeneratedMealPlanSchema,
} from "@/lib/schemas/meal-plans/generate/chat-schema";
import {
	Spoonacular,
	SpoonacularRecipeResponse,
	convertSpoonacularRecipeToRecipe,
} from "@/lib/server/spoonacular/spoonacular-helper";

import { SpoonacularAnalyzeRecipe } from "@/lib/schemas";
import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export interface SaveMealPlanRequest {
	generatedMealPlan: GeneratedMealPlan;
}

export type PostSaveResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body: SaveMealPlanRequest = await req.json();
		const { generatedMealPlan } = body;

		// Validate the generated meal plan matches schema
		const validationResult =
			GeneratedMealPlanSchema.safeParse(generatedMealPlan);

		if (!validationResult.success) {
			return jsonResponse(
				{
					error: "Invalid meal plan format",
					details: validationResult.error.errors,
				},
				{ status: 400 },
			);
		}

		const validatedPlan = validationResult.data;

		// Step 1: Fetch Spoonacular recipes in bulk if needed
		const spoonacularRecipeIds = validatedPlan.recipes
			.filter((recipe) => recipe.type === "spoonacular")
			.map((recipe) => recipe.id);

		let spoonacularRecipesMap = new Map<string, SpoonacularRecipeResponse>();

		if (spoonacularRecipeIds.length > 0) {
			try {
				const spoonacularRecipes = await Spoonacular.getRecipeInformationBulk({
					ids: spoonacularRecipeIds,
				});

				// Map Spoonacular ID to full recipe data
				for (const spoonacularRecipe of spoonacularRecipes) {
					spoonacularRecipesMap.set(
						spoonacularRecipe.id.toString(),
						spoonacularRecipe,
					);
				}
			} catch (error) {
				console.error("Error fetching Spoonacular recipes:", error);
				return jsonResponse(
					{
						error: `Failed to fetch Spoonacular recipes: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
					{ status: 500 },
				);
			}
		}

		// Step 2: Create new recipes (where recipe.type !== "saved")
		const newRecipeMap = new Map<string, string>(); // Map old IDs to new IDs

		for (const recipe of validatedPlan.recipes) {
			if (recipe.type !== "saved") {
				let analyzedRecipe;

				if (recipe.type === "spoonacular") {
					// Fetch from Spoonacular using the bulk data we already retrieved
					const spoonacularRecipe = spoonacularRecipesMap.get(recipe.id);

					if (!spoonacularRecipe) {
						console.error(
							`Spoonacular recipe ${recipe.id} not found in bulk fetch`,
						);
						return jsonResponse(
							{ error: `Spoonacular recipe ${recipe.id} not found` },
							{ status: 400 },
						);
					}

					// Convert to our Recipe format with nutrition data
					analyzedRecipe = convertSpoonacularRecipeToRecipe(spoonacularRecipe);
				} else {
					// recipe.type === "generated"
					// Analyze the generated recipe with Spoonacular to get nutrition info
					const spoonacularRecipe: SpoonacularAnalyzeRecipe = {
						title: recipe.name || "Untitled Recipe",
						servings: recipe.servings || 1,
						ingredients: recipe.ingredients || [],
						instructions: (recipe.instructions || []).join("\n"),
					};

					// Analyze recipe with Spoonacular to get nutrition info
					const spoonacularResponse = await Spoonacular.analyzeRecipe({
						recipe: spoonacularRecipe,
					});

					// Convert to our Recipe format with nutrition data
					analyzedRecipe =
						convertSpoonacularRecipeToRecipe(spoonacularResponse);
				}

				// Create new recipe using the analyzed data
				const { data: newRecipeId, error: recipeError } = await supabase.rpc(
					"add_recipe",
					{
						name: analyzedRecipe.name,
						number_of_servings: analyzedRecipe.servings,
						ingredients: analyzedRecipe.ingredients || [],
						instructions: analyzedRecipe.instructions || [],
					},
				);

				if (recipeError) {
					console.error("Error creating recipe:", recipeError);
					return jsonResponse(
						{ error: `Failed to create recipe: ${recipeError.message}` },
						{ status: 400 },
					);
				}

				newRecipeMap.set(recipe.id, newRecipeId as string);
			}
		}

		// Step 3: Create food entries with profile servings
		for (const foodEntry of validatedPlan.foodEntries) {
			// Use the new recipe ID if it was just created, otherwise use the existing ID
			const recipeId =
				newRecipeMap.get(foodEntry.recipe_id) || foodEntry.recipe_id;

			// Transform profile_servings array of arrays to array of { profile_id, servings } for the RPC
			// profile_servings format: [['profile-id', 2], ['profile-id-2', 1.5]]
			const profileServingsArray = foodEntry.profile_servings.map(
				([profileId, servings]) => ({
					profile_id: profileId as string,
					servings: servings as number,
				}),
			);

			// Capitalize meal_type for database enum
			const capitalizedMealType =
				foodEntry.meal_type.charAt(0).toUpperCase() +
				foodEntry.meal_type.slice(1);

			// Call create_food_entry_with_profiles RPC
			const { error: foodEntryError } = await supabase.rpc(
				"create_food_entry_with_profiles",
				{
					entry_date: foodEntry.date,
					entry_type: "Recipe",
					entry_meal_type: capitalizedMealType as
						| "Breakfast"
						| "Lunch"
						| "Dinner"
						| "Snack",
					entry_recipe_id: recipeId,
					profile_servings: profileServingsArray,
				},
			);

			if (foodEntryError) {
				console.error("Error creating food entry:", foodEntryError);
				return jsonResponse(
					{
						error: `Failed to create food entry: ${foodEntryError.message}`,
					},
					{ status: 400 },
				);
			}
		}

		// Step 4: Create notes
		for (const note of validatedPlan.notes) {
			// Capitalize meal_type for database enum
			const capitalizedMealType =
				note.meal_type.charAt(0).toUpperCase() + note.meal_type.slice(1);

			const insertData: any = {
				user_id: session.user.id,
				date: note.date,
				meal_type: capitalizedMealType,
				note_type: "day_meal",
				value: note.note,
				is_checkbox: false,
				is_checked: false,
				display_order: 0,
			};

			const { error: noteError } = await supabase
				.from("note")
				.insert(insertData);

			if (noteError) {
				console.error("Error creating note:", noteError);
				// Don't fail the whole operation if notes fail
				console.warn(
					`Failed to create note for ${note.date} ${note.meal_type}: ${noteError.message}`,
				);
			}
		}

		return jsonResponse(
			{
				success: true,
				message: "Meal plan saved successfully",
				recipesCreated: newRecipeMap.size,
				foodEntriesCreated: validatedPlan.foodEntries.length,
				notesCreated: validatedPlan.notes.length,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Save meal plan error:", error);

		if (error instanceof Error) {
			return jsonResponse(
				{ error: `Save failed: ${error.message}` },
				{ status: 500 },
			);
		}

		return jsonResponse({ error: "Failed to save meal plan" }, { status: 500 });
	}
}
