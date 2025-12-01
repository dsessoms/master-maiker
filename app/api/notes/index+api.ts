import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

export type GetNotesResponseType = Awaited<ReturnType<typeof GET>>;
export type PostNoteResponseType = Awaited<ReturnType<typeof POST>>;
export type PatchNoteResponseType = Awaited<ReturnType<typeof PATCH>>;
export type DeleteNoteResponseType = Awaited<ReturnType<typeof DELETE>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse(
			{ success: false, error: "Unauthorized", notes: [] },
			{ status: 401 },
		);
	}

	try {
		// Parse query parameters
		const url = new URL(req.url);
		const noteType = url.searchParams.get("noteType");
		const date = url.searchParams.get("date");
		const mealType = url.searchParams.get("mealType");
		const foodEntryId = url.searchParams.get("foodEntryId");
		const startDate = url.searchParams.get("startDate");
		const endDate = url.searchParams.get("endDate");

		// Build query
		let query = supabase
			.from("note")
			.select("*")
			.eq("user_id", session.user.id)
			.order("display_order", { ascending: true })
			.order("created_at", { ascending: true });

		// Apply filters based on note type
		if (noteType) {
			query = query.eq("note_type", noteType as "day_meal" | "food_entry");

			if (noteType === "day_meal") {
				if (date) {
					query = query.eq("date", date);
				}
				if (mealType) {
					query = query.eq(
						"meal_type",
						mealType as "Breakfast" | "Lunch" | "Dinner" | "Snack",
					);
				}
				// Date range query
				if (startDate) {
					query = query.gte("date", startDate);
				}
				if (endDate) {
					query = query.lte("date", endDate);
				}
			} else if (noteType === "food_entry" && foodEntryId) {
				query = query.eq("food_entry_id", foodEntryId);
			}
		}

		const { data: notes, error } = await query;

		if (error) {
			console.error("Error fetching notes:", error);
			return jsonResponse(
				{
					success: false,
					error: error.message || "Failed to fetch notes",
					notes: [],
				},
				{ status: 400 },
			);
		}

		return jsonResponse({
			success: true,
			notes: notes || [],
		});
	} catch (err) {
		console.error("Error in notes GET API:", err);
		return jsonResponse(
			{ success: false, error: "Internal server error", notes: [] },
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
		const {
			noteType,
			value,
			isCheckbox = false,
			isChecked = false,
			displayOrder = 0,
			date,
			mealType,
			foodEntryId,
		} = body;

		// Validate required fields
		if (!noteType || !value) {
			return jsonResponse(
				{
					success: false,
					error: "Missing required fields: noteType and value",
				},
				{ status: 400 },
			);
		}

		// Validate note type specific fields
		if (noteType === "day_meal") {
			if (!date || !mealType) {
				return jsonResponse(
					{
						success: false,
						error:
							"Missing required fields for day_meal note: date and mealType",
					},
					{ status: 400 },
				);
			}
		} else if (noteType === "food_entry") {
			if (!foodEntryId) {
				return jsonResponse(
					{
						success: false,
						error: "Missing required field for food_entry note: foodEntryId",
					},
					{ status: 400 },
				);
			}
		} else {
			return jsonResponse(
				{
					success: false,
					error: "Invalid noteType. Must be 'day_meal' or 'food_entry'",
				},
				{ status: 400 },
			);
		}

		// Prepare insert data
		const insertData: any = {
			user_id: session.user.id,
			note_type: noteType,
			value,
			is_checkbox: isCheckbox,
			is_checked: isChecked,
			display_order: displayOrder,
		};

		if (noteType === "day_meal") {
			insertData.date = date;
			insertData.meal_type = mealType;
		} else {
			insertData.food_entry_id = foodEntryId;
		}

		// Insert the note
		const { data: note, error } = await supabase
			.from("note")
			.insert(insertData)
			.select()
			.single();

		if (error) {
			console.error("Error creating note:", error);
			return jsonResponse(
				{
					success: false,
					error: error.message || "Failed to create note",
				},
				{ status: 400 },
			);
		}

		return jsonResponse({
			success: true,
			note,
			message: "Note created successfully",
		});
	} catch (err) {
		console.error("Error in notes POST API:", err);
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
		const { noteId, value, isCheckbox, isChecked, displayOrder } = body;

		// Validate required fields
		if (!noteId) {
			return jsonResponse(
				{
					success: false,
					error: "Missing required field: noteId",
				},
				{ status: 400 },
			);
		}

		// Verify the note belongs to the user
		const { data: note, error: fetchError } = await supabase
			.from("note")
			.select("user_id")
			.eq("id", noteId)
			.single();

		if (fetchError || !note) {
			console.error("Error fetching note:", fetchError);
			return jsonResponse(
				{
					success: false,
					error: "Note not found",
				},
				{ status: 404 },
			);
		}

		if (note.user_id !== session.user.id) {
			return jsonResponse(
				{
					success: false,
					error: "Unauthorized - note belongs to a different user",
				},
				{ status: 403 },
			);
		}

		// Build update data
		const updateData: any = {};
		if (value !== undefined) updateData.value = value;
		if (isCheckbox !== undefined) updateData.is_checkbox = isCheckbox;
		if (isChecked !== undefined) updateData.is_checked = isChecked;
		if (displayOrder !== undefined) updateData.display_order = displayOrder;

		if (Object.keys(updateData).length === 0) {
			return jsonResponse(
				{
					success: false,
					error: "No fields to update",
				},
				{ status: 400 },
			);
		}

		// Update the note
		const { data: updatedNote, error: updateError } = await supabase
			.from("note")
			.update(updateData)
			.eq("id", noteId)
			.select()
			.single();

		if (updateError) {
			console.error("Error updating note:", updateError);
			return jsonResponse(
				{
					success: false,
					error: updateError.message || "Failed to update note",
				},
				{ status: 400 },
			);
		}

		return jsonResponse({
			success: true,
			note: updatedNote,
			message: "Note updated successfully",
		});
	} catch (err) {
		console.error("Error in notes PATCH API:", err);
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
		const { noteId } = body;

		// Validate required fields
		if (!noteId) {
			return jsonResponse(
				{
					success: false,
					error: "Missing required field: noteId",
				},
				{ status: 400 },
			);
		}

		// Verify the note belongs to the user
		const { data: note, error: fetchError } = await supabase
			.from("note")
			.select("user_id")
			.eq("id", noteId)
			.single();

		if (fetchError || !note) {
			console.error("Error fetching note:", fetchError);
			return jsonResponse(
				{
					success: false,
					error: "Note not found",
				},
				{ status: 404 },
			);
		}

		if (note.user_id !== session.user.id) {
			return jsonResponse(
				{
					success: false,
					error: "Unauthorized - note belongs to a different user",
				},
				{ status: 403 },
			);
		}

		// Delete the note
		const { error: deleteError } = await supabase
			.from("note")
			.delete()
			.eq("id", noteId);

		if (deleteError) {
			console.error("Error deleting note:", deleteError);
			return jsonResponse(
				{
					success: false,
					error: deleteError.message || "Failed to delete note",
				},
				{ status: 400 },
			);
		}

		return jsonResponse({
			success: true,
			message: "Note deleted successfully",
		});
	} catch (err) {
		console.error("Error in notes DELETE API:", err);
		return jsonResponse(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// TypeScript interfaces
export interface Note {
	id: string;
	user_id: string;
	note_type: "day_meal" | "food_entry";
	date: string | null;
	meal_type: "Breakfast" | "Lunch" | "Dinner" | "Snack" | null;
	food_entry_id: string | null;
	value: string;
	is_checkbox: boolean;
	is_checked: boolean;
	display_order: number;
	created_at: string;
}

export interface GetNotesRequest {
	noteType?: "day_meal" | "food_entry";
	date?: string; // Format: YYYY-MM-DD
	mealType?: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	foodEntryId?: string;
	startDate?: string; // Format: YYYY-MM-DD
	endDate?: string; // Format: YYYY-MM-DD
}

export interface FetchNotesResponse {
	success: boolean;
	error?: string;
	notes: Note[];
}

export interface CreateNoteRequest {
	noteType: "day_meal" | "food_entry";
	value: string;
	isCheckbox?: boolean;
	isChecked?: boolean;
	displayOrder?: number;
	// For day_meal notes
	date?: string; // Format: YYYY-MM-DD
	mealType?: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	// For food_entry notes
	foodEntryId?: string;
}

export interface CreateNoteResponse {
	success: boolean;
	error?: string;
	note?: Note;
	message?: string;
}

export interface UpdateNoteRequest {
	noteId: string;
	value?: string;
	isCheckbox?: boolean;
	isChecked?: boolean;
	displayOrder?: number;
}

export interface UpdateNoteResponse {
	success: boolean;
	error?: string;
	note?: Note;
	message?: string;
}

export interface DeleteNoteRequest {
	noteId: string;
}

export interface DeleteNoteResponse {
	success: boolean;
	error?: string;
	message?: string;
}
