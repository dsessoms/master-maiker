import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export interface ClearMealPlanRequest {
	startDate: string; // yyyy-MM-dd format
	endDate: string; // yyyy-MM-dd format
}

export interface ClearMealPlanByDatesRequest {
	dates: string[]; // yyyy-MM-dd format
}

export type DeleteClearResponse = Awaited<ReturnType<typeof DELETE>>;

export async function DELETE(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const url = new URL(req.url);
		const datesParam = url.searchParams.get("dates");
		const startDate = url.searchParams.get("startDate");
		const endDate = url.searchParams.get("endDate");

		if (!datesParam && (!startDate || !endDate)) {
			return jsonResponse(
				{ error: "Either dates or startDate and endDate are required" },
				{ status: 400 },
			);
		}

		// Step 1: Delete food entries for the specified dates or date range
		// Cascading delete will automatically remove associated profile_food_entry records
		const foodEntryQuery = supabase
			.from("food_entry")
			.delete({ count: "exact" })
			.eq("user_id", session.user.id);

		const { error: deleteError, count: deletedCount } = datesParam
			? await foodEntryQuery.in("date", datesParam.split(","))
			: await foodEntryQuery.gte("date", startDate!).lte("date", endDate!);

		if (deleteError) {
			console.error("Error deleting food entries:", deleteError);
			return jsonResponse(
				{ error: `Failed to delete food entries: ${deleteError.message}` },
				{ status: 400 },
			);
		}

		const deletedFoodEntriesCount = deletedCount || 0;
		let deletedNotesCount = 0;

		// Step 2: Delete notes for the specified dates or date range
		const notesQuery = supabase
			.from("note")
			.delete({ count: "exact" })
			.eq("user_id", session.user.id)
			.eq("note_type", "day_meal");

		const { error: notesError, count: notesCount } = datesParam
			? await notesQuery.in("date", datesParam.split(","))
			: await notesQuery.gte("date", startDate!).lte("date", endDate!);

		if (notesError) {
			console.error("Error deleting notes:", notesError);
			// Don't fail the whole operation if notes deletion fails
			console.warn(`Failed to delete notes: ${notesError.message}`);
		} else {
			deletedNotesCount = notesCount || 0;
		}

		return jsonResponse(
			{
				success: true,
				message: "Meal plan cleared successfully",
				deletedFoodEntries: deletedFoodEntriesCount,
				deletedNotes: deletedNotesCount,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Clear meal plan error:", error);

		if (error instanceof Error) {
			return jsonResponse(
				{ error: `Clear failed: ${error.message}` },
				{ status: 500 },
			);
		}

		return jsonResponse(
			{ error: "Failed to clear meal plan" },
			{ status: 500 },
		);
	}
}
