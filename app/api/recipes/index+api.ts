import { FatSecretFood } from "@/lib/fat-secret/types";
import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

interface Ingredient {
	fsFood: FatSecretFood;
	fsServingId: string | number;
	numberOfServings: number;
	meta?: string | null;
	order: number;
}

export interface PostRecipesRequest {
	name: string;
	number_of_servings: number;
	description?: string | null;
	instructions?: string[] | null;
	ingredients?: Ingredient[] | null;
	prep_time_hours?: string | number | null;
	prep_time_minutes?: string | number | null;
	cook_time_hours?: string | number | null;
	cook_time_minutes?: string | number | null;
	image_id?: string | null;
}

export type GetRecipesResponse = Awaited<ReturnType<typeof GET>>;
export type PostRecipesResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	// get body
	const recipe = (await req.json()) as PostRecipesRequest;

	if (!recipe.ingredients) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	// get fat secret foods
	// const foodMap = await storeFatSecretFoods(recipe.ingredients);

	// create recipe
	const { data, error } = await supabase.rpc("add_recipe", {
		name: recipe.name,
		number_of_servings: Number(recipe.number_of_servings),
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
		ingredients: [],
		// recipe.ingredients.map((ing) => {
		// 	const mappedFood = foodMap[ing.fsFood.food_id];
		// 	return {
		// 		food_id: mappedFood!.food_id,
		// 		serving_id: mappedFood!.serving_id,
		// 		meta: ing.meta,
		// 		order: ing.order,
		// 		number_of_servings: ing.numberOfServings,
		// 		user_id: user.id,
		// 	};
		// }),
	});

	if (error) {
		console.log(error);
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

	console.log("here", recipeRows);

	return jsonResponse({ recipes: recipeRows.data });
}
