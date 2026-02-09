import { Json } from "@/database.types";
import { Recipe } from "@/lib/schemas";
import { supabase } from "@/config/supabase-server";

export function mapRecipeToRpcParams(recipe: Recipe, recipeId?: string) {
	return {
		...(recipeId && { recipe_id: recipeId }),
		name: recipe.name,
		number_of_servings: Number(recipe.servings),
		description: recipe.description ?? undefined,
		prep_time_hours: recipe.prep_time_hours
			? Number(recipe.prep_time_hours)
			: undefined,
		prep_time_minutes: recipe.prep_time_minutes
			? Number(recipe.prep_time_minutes)
			: undefined,
		cook_time_hours: recipe.cook_time_hours
			? Number(recipe.cook_time_hours)
			: undefined,
		cook_time_minutes: recipe.cook_time_minutes
			? Number(recipe.cook_time_minutes)
			: undefined,
		image_id: recipe.image_id ?? undefined,
		instructions: recipe.instructions ?? [],
		ingredients: recipe.ingredients as Json[],
	};
}

export async function upsertRecipe(recipe: Recipe, recipeId?: string) {
	const { data, error } = await supabase.rpc(
		"add_recipe",
		mapRecipeToRpcParams(recipe, recipeId),
	);

	if (error) {
		console.error("Recipe upsert error:", error);
		throw error;
	}

	return data;
}
