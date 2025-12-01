import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

export type GetFoodEntriesResponse = Awaited<ReturnType<typeof GET>>;
export type PostAddFoodEntryResponse = Awaited<ReturnType<typeof POST>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse(
			{ success: false, error: "Unauthorized", foodEntries: [] },
			{ status: 401 },
		);
	}

	try {
		// Parse query parameters
		const url = new URL(req.url);
		const startDate = url.searchParams.get("startDate");
		const endDate = url.searchParams.get("endDate");

		// Validate required fields
		if (!startDate || !endDate) {
			return jsonResponse(
				{
					success: false,
					error: "Missing required query parameters: startDate and endDate",
					foodEntries: [],
				},
				{ status: 400 },
			);
		}

		// Fetch food entries for the user within the date range
		const { data: foodEntries, error } = await supabase
			.from("food_entry")
			.select(
				`
				id,
				date,
				type,
				meal_type,
				food_id,
				serving_id,
				recipe_id,
				user_id,
				created_at,
				profile_food_entry (
					id,
					profile_id,
					number_of_servings,
					profile:profile_id (
						id,
						name,
						avatar_id
					)
				),
				recipe:recipe_id (
					id,
					name,
					image_id,
					number_of_servings
				),
				food:food_id (
					id,
					food_name,
					image_url
				),
				serving:serving_id (
					id,
					serving_description,
					calories,
					protein,
					carbohydrate,
					fat
				)
			`,
			)
			.eq("user_id", session.user.id)
			.gte("date", startDate)
			.lte("date", endDate)
			.order("date", { ascending: false })
			.order("meal_type", { ascending: true });

		if (error) {
			console.error("Error fetching food entries:", error);
			return jsonResponse(
				{
					success: false,
					error: error.message || "Failed to fetch food entries",
					foodEntries: [],
				},
				{ status: 400 },
			);
		}

		return jsonResponse({
			success: true,
			foodEntries: foodEntries || [],
		});
	} catch (err) {
		console.error("Error in fetch-food-entries API:", err);
		return jsonResponse(
			{ success: false, error: "Internal server error", foodEntries: [] },
			{ status: 500 },
		);
	}
}

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

export async function DELETE(req: Request) {
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
		const { foodEntryId } = body;

		// Validate required fields
		if (!foodEntryId) {
			return jsonResponse(
				{
					success: false,
					error: "Missing required field: foodEntryId",
				},
				{ status: 400 },
			);
		}

		// Verify the food entry belongs to the user
		const { data: foodEntry, error: fetchError } = await supabase
			.from("food_entry")
			.select("user_id")
			.eq("id", foodEntryId)
			.single();

		if (fetchError || !foodEntry) {
			console.error("Error fetching food entry:", fetchError);
			return jsonResponse(
				{
					success: false,
					error: "Food entry not found",
				},
				{ status: 404 },
			);
		}

		if (foodEntry.user_id !== session.user.id) {
			return jsonResponse(
				{
					success: false,
					error: "Unauthorized - food entry belongs to a different user",
				},
				{ status: 403 },
			);
		}

		// Delete the food entry (cascading delete will handle profile_food_entry records)
		const { error: deleteError } = await supabase
			.from("food_entry")
			.delete()
			.eq("id", foodEntryId);

		if (deleteError) {
			console.error("Error deleting food entry:", deleteError);
			return jsonResponse(
				{
					success: false,
					error: deleteError.message || "Failed to delete food entry",
				},
				{ status: 400 },
			);
		}

		return jsonResponse({
			success: true,
			message: "Food entry deleted successfully",
		});
	} catch (err) {
		console.error("Error in delete-food-entry API:", err);
		return jsonResponse(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function PATCH(req: Request) {
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
		const { foodEntryId, date, mealType, profileServings } = body;

		// Validate required fields
		if (!foodEntryId) {
			return jsonResponse(
				{
					success: false,
					error: "Missing required field: foodEntryId",
				},
				{ status: 400 },
			);
		}

		// Verify the food entry belongs to the user
		const { data: foodEntry, error: fetchError } = await supabase
			.from("food_entry")
			.select("user_id")
			.eq("id", foodEntryId)
			.single();

		if (fetchError || !foodEntry) {
			console.error("Error fetching food entry:", fetchError);
			return jsonResponse(
				{
					success: false,
					error: "Food entry not found",
				},
				{ status: 404 },
			);
		}

		if (foodEntry.user_id !== session.user.id) {
			return jsonResponse(
				{
					success: false,
					error: "Unauthorized - food entry belongs to a different user",
				},
				{ status: 403 },
			);
		}

		// Update the food entry basic fields
		const updateData: any = {};
		if (date) updateData.date = date;
		if (mealType) updateData.meal_type = mealType;

		if (Object.keys(updateData).length > 0) {
			const { error: updateError } = await supabase
				.from("food_entry")
				.update(updateData)
				.eq("id", foodEntryId);

			if (updateError) {
				console.error("Error updating food entry:", updateError);
				return jsonResponse(
					{
						success: false,
						error: updateError.message || "Failed to update food entry",
					},
					{ status: 400 },
				);
			}
		}

		// Update profile servings if provided
		if (profileServings && profileServings.length > 0) {
			// Delete existing profile servings
			const { error: deleteError } = await supabase
				.from("profile_food_entry")
				.delete()
				.eq("food_entry_id", foodEntryId);

			if (deleteError) {
				console.error("Error deleting profile servings:", deleteError);
				return jsonResponse(
					{
						success: false,
						error: "Failed to update profile servings",
					},
					{ status: 400 },
				);
			}

			// Insert new profile servings
			const insertData = profileServings.map(
				(ps: { profile_id: string; servings: number }) => ({
					food_entry_id: foodEntryId,
					profile_id: ps.profile_id,
					number_of_servings: ps.servings,
				}),
			);

			const { error: insertError } = await supabase
				.from("profile_food_entry")
				.insert(insertData);

			if (insertError) {
				console.error("Error inserting profile servings:", insertError);
				return jsonResponse(
					{
						success: false,
						error: "Failed to update profile servings",
					},
					{ status: 400 },
				);
			}
		}

		return jsonResponse({
			success: true,
			message: "Food entry updated successfully",
		});
	} catch (err) {
		console.error("Error in update-food-entry API:", err);
		return jsonResponse(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export interface FoodEntry {
	id: string;
	date: string;
	type: "Recipe" | "Food";
	meal_type: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	food_id: string | null;
	serving_id: string | null;
	recipe_id: string | null;
	user_id: string;
	created_at: string;
	profile_food_entry: {
		id: string;
		profile_id: string;
		number_of_servings: number;
		profile: {
			id: string;
			name: string;
			avatar_id: string | null;
		};
	}[];
	recipe: {
		id: string;
		name: string;
		image_id: string | null;
		number_of_servings: number;
	} | null;
	food: {
		id: string;
		food_name: string;
		image_url: string | null;
	} | null;
	serving: {
		id: string;
		serving_description: string;
		calories: number;
		protein: number;
		carbohydrate: number;
		fat: number;
	} | null;
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

export interface FetchFoodEntriesResponse {
	success: boolean;
	error?: string;
	foodEntries: FoodEntry[];
}

export interface DeleteFoodEntryResponse {
	success: boolean;
	error?: string;
	message?: string;
}

export interface UpdateFoodEntryRequest {
	foodEntryId: string;
	date?: string; // Format: YYYY-MM-DD
	mealType?: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	profileServings?: {
		profile_id: string;
		servings: number;
	}[];
}

export interface UpdateFoodEntryResponse {
	success: boolean;
	error?: string;
	message?: string;
}
