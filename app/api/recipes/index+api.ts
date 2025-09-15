import { Recipe } from "@/lib/schemas";
import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

export type GetRecipesResponse = Awaited<ReturnType<typeof GET>>;
export type PostRecipesResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	// get body
	const recipe = (await req.json()) as Recipe;

	if (!recipe.ingredients) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	// create recipe
	const { data, error } = await supabase.rpc("add_recipe", {
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
		ingredients: recipe.ingredients,
	});

	if (error) {
		console.error(error);
		return jsonResponse({ id: undefined }, { status: 400 });
	}

	return jsonResponse({ id: data });
}

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ recipes: undefined }, { status: 401 });
	}

	const recipeRows = await supabase
		.from("recipe")
		.select(`*, macros:recipe_macros (*)`)
		.order("created_at", { ascending: false })
		.eq("user_id", session.user.id);

	return jsonResponse({ recipes: recipeRows.data });
}
