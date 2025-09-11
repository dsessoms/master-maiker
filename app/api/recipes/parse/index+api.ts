import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4, v4 } from "uuid";

import { ApiResponseType } from "../../../../types";
import { Database } from "../../../../database.types";
import { EditableRecipe } from "../../../recipes/new/recipe-creator";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import recipeDataScraper from "recipe-data-scraper";
import { simplifiedFoodConverter } from "../../../../utils/simplified-food-converter";

export const dynamic = "force-dynamic";

export type GetParsedRecipeResponse = ApiResponseType<typeof GET>;

export async function GET(req: NextRequest) {
	const supabase = createRouteHandlerClient<Database>({ cookies });
	const urlParam = req.nextUrl.searchParams.get("url");

	if (!urlParam) {
		return NextResponse.json({ recipe: undefined }, { status: 401 });
	}

	const url = decodeURI(urlParam);

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ recipe: undefined }, { status: 401 });
	}

	try {
		// pass a full url to a page that contains a recipe
		const recipe = await recipeDataScraper(url);

		let imageId: string | undefined;

		if (recipe.image) {
			const blob = await fetch(recipe.image).then((r) => r.blob());
			imageId = uuidv4();
			await supabase.storage.from("recipe-photos").upload(imageId, blob);
		}

		const parsedIngredients = [];
		for (const ingredient of recipe.recipeIngredients) {
			// add delay for parser as a temp work around for fat secret
			await new Promise((resolve) => setTimeout(resolve, 200));
			const parsedValue = await simplifiedFoodConverter(ingredient);
			parsedIngredients.push(parsedValue);
		}
		const fatSecretIngredients = parsedIngredients.map(
			({ topParsedResult, originalName }) => ({
				id: v4(),
				food: topParsedResult.food,
				serving: topParsedResult.serving,
				serving_id: topParsedResult.serving.serving_id,
				number_of_servings: topParsedResult.estimatedNumberOfServings,
				originalName,
			}),
		);

		const prep_time_minutes = recipe.prepTime?.split(" ")?.[0];
		const cook_time_minutes = recipe.cookTime?.split(" ")?.[0];

		const editableRecipes: EditableRecipe = {
			name: recipe.name,
			image_id: imageId,
			number_of_servings: Number(recipe.recipeYield) || 1,
			description: recipe.description,
			prep_time_hours: 0,
			prep_time_minutes: prep_time_minutes ? Number(prep_time_minutes) : 0,
			cook_time_hours: 0,
			cook_time_minutes: cook_time_minutes ? Number(cook_time_minutes) : 0,
			instructions: recipe.recipeInstructions.map((ins) => ({
				id: v4(),
				value: ins,
			})),
			ingredients: fatSecretIngredients,
		};
		return NextResponse.json({
			recipe: editableRecipes,
		});
	} catch (error) {
		console.error(error);
		return NextResponse.json({ recipe: undefined }, { status: 404 });
	}
}
