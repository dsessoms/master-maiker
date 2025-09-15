import {
	Spoonacular,
	convertSpoonacularRecipeToRecipe,
} from "../../../../lib/server/spoonacular/spoonacular-helper";

import { Recipe } from "../../../../lib/schemas/recipe-schema";
import { jsonResponse } from "../../../../lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { v4 as uuidv4 } from "uuid";
import { validateSession } from "../../../../lib/server/validate-session";

export type GetParsedRecipeResponse = Awaited<ReturnType<typeof GET>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ recipe: undefined }, { status: 401 });
	}

	// Extract the url query parameter from the URL
	const url = new URL(req.url);
	const urlParam = url.searchParams.get("url");

	if (!urlParam) {
		return jsonResponse({ recipe: undefined }, { status: 400 });
	}

	const recipeUrl = decodeURI(urlParam);

	try {
		// Use Spoonacular to parse recipe from website
		const spoonacularRecipe = await Spoonacular.parseRecipeFromWebsite({
			url: recipeUrl,
		});

		// Convert to our Recipe format
		const recipe = convertSpoonacularRecipeToRecipe(spoonacularRecipe);

		let imageId: string | undefined;

		if (spoonacularRecipe.image) {
			const blob = await fetch(spoonacularRecipe.image).then((r) => r.blob());
			imageId = uuidv4();
			await supabase.storage.from("recipe-photos").upload(imageId, blob);
		}

		// Return the recipe with image_id added
		const finalRecipe: Recipe = {
			...recipe,
			image_id: imageId,
		};

		return jsonResponse({ recipe: finalRecipe });
	} catch (error) {
		console.error(error);
		return jsonResponse({ recipe: undefined }, { status: 404 });
	}
}
