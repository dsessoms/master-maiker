import { Recipe } from "@/lib/schemas";
import { extractParamsFromRequest } from "@/lib/url-params";
import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { upsertRecipe } from "@/lib/server/recipe-helpers";
import { validateSession } from "@/lib/server/validate-session";
import { Database } from "@/database.types";

export type GetRecipeResponse = NonNullable<Awaited<ReturnType<typeof GET>>>;
export type PutRecipeResponse = Awaited<ReturnType<typeof PUT>>;
export type PatchRecipeResponse = Awaited<ReturnType<typeof PATCH>>;
export type DeleteRecipeResponse = Awaited<ReturnType<typeof DELETE>>;

export async function GET(req: Request) {
	// Try to get session, but don't require it for public recipes
	const session = await validateSession(req);

	const { id: recipeId } = extractParamsFromRequest(
		req,
		"/api/recipes/[id]",
	) as {
		id: string;
	};

	if (!recipeId) {
		return jsonResponse({ recipe: undefined }, { status: 404 });
	}

	// Build query based on authentication status
	let query = supabase
		.from("recipe")
		.select(
			`*,
      macros:recipe_macros (*),
      ingredient (
        *,
        food (
          *,
          food_id:fat_secret_id,
          serving(*)
        ),
        serving (serving_id:fat_secret_id, *)
      ),
      instruction (*)
      `,
		)
		.eq("id", recipeId);

	// If authenticated, filter by user_id OR visibility = 'public'
	// If not authenticated, only allow visibility = 'public'
	if (session.user) {
		query = query.or(`user_id.eq.${session.user.id},visibility.eq.public`);
	} else {
		query = query.eq("visibility", "public");
	}

	const { data, error, status } = await query.single();

	if (error) {
		return jsonResponse({ recipe: undefined }, { status });
	}

	return jsonResponse({ recipe: data });
}

export async function PUT(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	const { id: recipeId } = extractParamsFromRequest(
		req,
		"/api/recipes/[id]",
	) as {
		id: string;
	};

	// get body
	const recipe = (await req.json()) as Recipe;

	if (!recipe.ingredients) {
		return jsonResponse(
			{ id: undefined },
			{ status: 400, statusText: "Recipes require at least 1 ingredient" },
		);
	}

	try {
		const id = await upsertRecipe(recipe, recipeId);
		return jsonResponse({ id });
	} catch {
		return jsonResponse({ id: undefined }, { status: 500 });
	}
}

export async function PATCH(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ success: false }, { status: 401 });
	}

	const { id: recipeId } = extractParamsFromRequest(
		req,
		"/api/recipes/[id]",
	) as {
		id: string;
	};

	if (!recipeId) {
		return jsonResponse({ success: false }, { status: 404 });
	}

	const body = (await req.json()) as Partial<
		Database["public"]["Tables"]["recipe"]["Update"]
	>;

	// Verify ownership before updating
	const { data: existingRecipe } = await supabase
		.from("recipe")
		.select("user_id")
		.eq("id", recipeId)
		.eq("user_id", session.user.id)
		.single();

	if (!existingRecipe) {
		return jsonResponse(
			{ success: false },
			{ status: 404, statusText: "Recipe not found or access denied" },
		);
	}

	const { error, status } = await supabase
		.from("recipe")
		.update(body)
		.eq("id", recipeId)
		.eq("user_id", session.user.id);

	if (error) {
		return jsonResponse({ success: false }, { status });
	}

	return jsonResponse({ success: true });
}

export async function DELETE(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	const { id: recipeId } = extractParamsFromRequest(
		req,
		"/api/recipes/[id]",
	) as {
		id: string;
	};

	const { error, status } = await supabase
		.from("recipe")
		.delete()
		.eq("user_id", session.user.id)
		.eq("id", recipeId);

	if (error) {
		return jsonResponse(null, { status });
	}

	return jsonResponse(null, { status: 200 });
}
