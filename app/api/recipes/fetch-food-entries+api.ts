import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

export type GetFoodEntriesResponse = Awaited<ReturnType<typeof GET>>;

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

		console.log(
			`Fetching food entries for user ${session.user.id} from ${startDate} to ${endDate}`,
		);

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

		console.log(`Found ${foodEntries?.length || 0} food entries`);

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

export interface FetchFoodEntriesResponse {
	success: boolean;
	error?: string;
	foodEntries: FoodEntry[];
}
