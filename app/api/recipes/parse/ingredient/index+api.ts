import {
	Spoonacular,
	convertSpoonacularToIngredient,
} from "@/lib/server/spoonacular/spoonacular-helper";

import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";

export type PostParsedIngredientsResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ ingredients: undefined }, { status: 401 });
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResponse(
			{ error: "Invalid JSON in request body" },
			{ status: 400 },
		);
	}

	const { ingredients } = body;

	if (!ingredients || !Array.isArray(ingredients)) {
		return jsonResponse(
			{ error: "Missing or invalid 'ingredients' array in request body" },
			{ status: 400 },
		);
	}

	if (ingredients.length === 0) {
		return jsonResponse(
			{ error: "Ingredients array cannot be empty" },
			{ status: 400 },
		);
	}

	try {
		// Join ingredients with newlines as required by Spoonacular API
		const ingredientList = ingredients.join("\n");

		const spoonacularIngredients = await Spoonacular.parseIngredients({
			ingredientList,
		});

		// Convert Spoonacular ingredients to our Ingredient format
		const parsedIngredients = spoonacularIngredients.map(
			convertSpoonacularToIngredient,
		);

		return jsonResponse({ ingredients: parsedIngredients });
	} catch (error) {
		return jsonResponse(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to parse ingredients",
			},
			{ status: 500 },
		);
	}
}
