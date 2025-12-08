import { MealPlanChatRecipe } from "@/lib/schemas";
import { extractParamsFromRequest } from "@/lib/url-params";
import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export type GetRecipeResponse = NonNullable<Awaited<ReturnType<typeof GET>>>;
export type PutRecipeResponse = Awaited<ReturnType<typeof PUT>>;
export type DeleteRecipeResponse = Awaited<ReturnType<typeof DELETE>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ recipe: undefined }, { status: 401 });
	}

	const { id: recipeId } = extractParamsFromRequest(
		req,
		"/api/recipes/[id]",
	) as {
		id: string;
	};

	if (!recipeId) {
		return jsonResponse({ recipe: undefined }, { status: 404 });
	}

	const { data, error, status } = await supabase
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
		.eq("id", recipeId)
		.eq("user_id", session.user.id)
		.single();

	if (error) {
		return jsonResponse(null, { status });
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
	const recipe = (await req.json()) as MealPlanChatRecipe;

	if (!recipe.ingredients) {
		return jsonResponse(
			{ id: undefined },
			{ status: 400, statusText: "Recipes require at least 1 ingredient" },
		);
	}

	// Use the add_recipe RPC function with the existing recipe ID to update
	const { data, error } = await supabase.rpc("add_recipe", {
		recipe_id: recipeId,
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
		console.error("Recipe update error:", error);
		return jsonResponse({ id: undefined }, { status: 500 });
	}

	return jsonResponse({ id: data });
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
