import { NextRequest, NextResponse } from "next/server";

import { ApiResponseType } from "../../../../types";
import { Database } from "../../../../database.types";
import { PostRecipesRequest } from "../index+api";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { storeFatSecretFoods } from "../../fat-secret/_helper/store-fat-secret-foods";

export const dynamic = "force-dynamic";

export type GetRecipeResponse = NonNullable<ApiResponseType<typeof GET>>;
export type PutRecipeResponse = ApiResponseType<typeof PUT>;

export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	const supabase = createRouteHandlerClient<Database>({ cookies });

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ recipe: undefined }, { status: 401 });
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
		.eq("id", params.id)
		.eq("user_id", user.id)
		.single();

	if (error) {
		return NextResponse.json(null, { status });
	}

	return NextResponse.json({ recipe: data });
}

export async function PUT(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	const supabase = createRouteHandlerClient<Database>({ cookies });

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ id: undefined }, { status: 401 });
	}

	// get body
	const recipe = (await req.json()) as PostRecipesRequest;

	if (!recipe.ingredients) {
		return NextResponse.json(
			{ id: undefined },
			{ status: 400, statusText: "Recipes require at least 1 ingredient" },
		);
	}

	const foodMap = await storeFatSecretFoods(recipe.ingredients);

	// create recipe
	const { data, error, status } = await supabase.rpc("add_recipe", {
		recipe_id: params.id,
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
		ingredients: recipe.ingredients.map((ing) => {
			const mappedFood = foodMap[ing.fsFood.food_id];
			return {
				food_id: mappedFood!.food_id,
				serving_id: mappedFood!.serving_id,
				meta: ing.meta,
				order: ing.order,
				number_of_servings: ing.numberOfServings,
				user_id: user.id,
			};
		}),
	});

	if (error) {
		return NextResponse.json({ id: undefined }, { status });
	}

	return NextResponse.json({ id: data });
}

export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string } },
) {
	const supabase = createRouteHandlerClient<Database>({ cookies });

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ id: undefined }, { status: 401 });
	}

	const { error, status } = await supabase
		.from("recipe")
		.delete()
		.eq("user_id", user.id)
		.eq("id", params.id);

	if (error) {
		return NextResponse.json(null, { status });
	}

	return NextResponse.json(null, { status: 200 });
}
