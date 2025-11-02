import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

export type PostAddFoodEntryResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	try {
		// Parse request body
		const body = await req.json();
		const { date, mealType, recipeId, profileServings } = body;

		// Validate required fields
		if (
			!date ||
			!mealType ||
			!recipeId ||
			!profileServings ||
			profileServings.length === 0
		) {
			return jsonResponse(
				{
					success: false,
					error:
						"Missing required fields: date, mealType, recipeId, and non-empty profileServings array",
				},
				{ status: 400 },
			);
		}

		// Call the create_food_entry_with_profiles function
		const { data, error } = await supabase.rpc(
			"create_food_entry_with_profiles",
			{
				entry_date: date,
				entry_type: "Recipe",
				entry_meal_type: mealType,
				entry_recipe_id: recipeId,
				profile_servings: profileServings,
			},
		);

		if (error) {
			console.error("Error creating food entry:", error);
			return jsonResponse(
				{
					success: false,
					error: error.message || "Failed to create food entry",
				},
				{ status: 400 },
			);
		}

		return jsonResponse({
			success: true,
			foodEntryId: data,
			message: "Food entry created successfully",
		});
	} catch (err) {
		console.error("Error in add-food-entry API:", err);
		return jsonResponse(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export interface AddFoodEntryRequest {
	date: string; // Format: YYYY-MM-DD
	mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	recipeId: string;
	profileServings: {
		profile_id: string;
		servings: number;
	}[];
}

export interface AddFoodEntryResponse {
	success: boolean;
	foodEntryId?: string;
	error?: string;
	message?: string;
}
