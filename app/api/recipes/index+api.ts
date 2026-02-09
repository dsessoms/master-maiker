import { Recipe } from "@/lib/schemas";
import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { upsertRecipe } from "@/lib/server/recipe-helpers";
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

	try {
		const id = await upsertRecipe(recipe);
		return jsonResponse({ id });
	} catch {
		return jsonResponse({ id: undefined }, { status: 400 });
	}
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
