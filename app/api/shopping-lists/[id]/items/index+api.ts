import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export interface PostShoppingListItemRecipe {
	type: "RECIPE";
	recipeId: string;
	numberOfServings: number;
	includedIngredientIds: string[];
}

export interface PostShoppingListItemFood {
	type: "FOOD";
	foodId: string;
	servingId: string;
	numberOfServings: number;
}

export interface PostShoppingListItemCustom {
	type: "CUSTOM";
	name: string;
}

export type PostItem =
	| PostShoppingListItemRecipe
	| PostShoppingListItemFood
	| PostShoppingListItemCustom;

export type PostShoppingListItemRequest = PostItem | PostItem[];

export interface PatchShoppingListItemsRequest {
	action: "clear";
	itemsToClear: "all" | "checked";
}

export type GetShoppingListItemsResponse = Awaited<ReturnType<typeof GET>>;
export type PostShoppingListItemsResponse = Awaited<ReturnType<typeof POST>>;
export type PatchShoppingListItemsResponse = Awaited<ReturnType<typeof PATCH>>;

export async function POST(req: Request, { id }: { id: string }) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	// get body
	const body = (await req.json()) as PostShoppingListItemRequest;

	let postItems;
	if (Array.isArray(body)) {
		postItems = body;
	} else {
		postItems = [body];
	}

	const shoppingListItems = [];

	for (const item of postItems) {
		if (item.type === "CUSTOM") {
			const { name } = item;

			shoppingListItems.push({
				shopping_list_id: id,
				user_id: session.user.id,
				name,
			});
		} else if (item.type === "FOOD") {
			const { numberOfServings, foodId, servingId } = item;

			shoppingListItems.push({
				shopping_list_id: id,
				user_id: session.user.id,
				number_of_servings: numberOfServings,
				food_id: foodId,
				serving_id: servingId,
			});
		} else if (item.type === "RECIPE") {
			const { recipeId, numberOfServings, includedIngredientIds } = item;
			// 1. pull ingredients from recipe
			const { data } = await supabase
				.from("ingredient")
				.select(
					`id, recipe(number_of_servings), food_id, serving_id, number_of_servings`,
				)
				.eq("user_id", session.user.id)
				.eq("recipe_id", recipeId);
			// 2. add each ingredient to shopping list (scaled by number of servings)
			const ingredients = data ?? [];
			const filteredIngredients = ingredients.filter((ingredient) =>
				includedIngredientIds.includes(ingredient.id),
			);
			for (const ingredient of filteredIngredients) {
				// (number of servings of the ingredient per recipe) * (selected servings of recipe) / (base servings of recipe)
				const servings =
					((ingredient.number_of_servings ?? 1) * numberOfServings) /
					(ingredient.recipe?.number_of_servings ?? 1);

				shoppingListItems.push({
					shopping_list_id: id,
					user_id: session.user.id,
					number_of_servings: servings,
					food_id: ingredient.food_id,
					serving_id: ingredient.serving_id,
					recipe_id: recipeId,
				});
			}
		}
	}

	const { error } = await supabase
		.from("shopping_list_item")
		.insert(shoppingListItems);

	if (error) {
		console.error(error);
		return jsonResponse({ id: undefined }, { status: 400 });
	}

	return jsonResponse({});
}

export async function GET(req: Request, { id }: { id: string }) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ items: undefined }, { status: 401 });
	}

	const { data, error } = await supabase
		.from("shopping_list_item")
		.select(
			`id, 
      name,
      is_checked,
      number_of_servings,
      notes,
      recipe_id,
      food(id, food_name, food_type, brand_name, aisle, image_url, fat_secret_id, spoonacular_id, serving(*)), 
      recipe(id, name, image_id),
      serving(
        id, 
        measurement_description,
        serving_description,
        number_of_units
      )`,
		)
		.eq("shopping_list_id", id)
		.eq("user_id", session.user.id)
		.order("created_at");

	if (error) {
		console.error(error);
		return jsonResponse({ items: undefined }, { status: 400 });
	}

	return jsonResponse({ items: data });
}

export async function PATCH(req: Request, { id }: { id: string }) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({}, { status: 401 });
	}

	// get body
	const body = (await req.json()) as PatchShoppingListItemsRequest;

	if (body.action === "clear") {
		if (body.itemsToClear === "all") {
			const { error } = await supabase
				.from("shopping_list_item")
				.delete()
				.eq("shopping_list_id", id)
				.eq("user_id", session.user.id);

			if (error) {
				console.error(error);
				return jsonResponse({}, { status: 400 });
			}
		}

		if (body.itemsToClear === "checked") {
			const { error } = await supabase
				.from("shopping_list_item")
				.delete()
				.eq("shopping_list_id", id)
				.eq("is_checked", true)
				.eq("user_id", session.user.id);

			if (error) {
				console.error(error);
				return jsonResponse({}, { status: 400 });
			}
		}
	}

	return jsonResponse({}, { status: 200 });
}
