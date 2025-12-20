import { z } from "zod";

// Base note schema from database
export const NoteSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	note_type: z.enum(["day_meal", "food_entry"]),
	date: z.string().nullable(),
	meal_type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]).nullable(),
	food_entry_id: z.string().nullable(),
	value: z.string(),
	is_checkbox: z.boolean(),
	is_checked: z.boolean(),
	display_order: z.number(),
	created_at: z.string(),
});

export type Note = z.infer<typeof NoteSchema>;

// Request schemas
export const GetNotesRequestSchema = z.object({
	noteType: z.enum(["day_meal", "food_entry"]).optional(),
	date: z.string().optional(), // Format: YYYY-MM-DD
	mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]).optional(),
	foodEntryId: z.string().optional(),
	startDate: z.string().optional(), // Format: YYYY-MM-DD
	endDate: z.string().optional(), // Format: YYYY-MM-DD
});

export type GetNotesRequest = z.infer<typeof GetNotesRequestSchema>;

export const CreateNoteRequestSchema = z
	.object({
		noteType: z.enum(["day_meal", "food_entry"]),
		value: z.string(),
		isCheckbox: z.boolean().optional().default(false),
		isChecked: z.boolean().optional().default(false),
		displayOrder: z.number().optional().default(0),
		// For day_meal notes
		date: z.string().optional(), // Format: YYYY-MM-DD
		mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]).optional(),
		// For food_entry notes
		foodEntryId: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.noteType === "day_meal") {
				return !!data.date && !!data.mealType;
			}
			if (data.noteType === "food_entry") {
				return !!data.foodEntryId;
			}
			return false;
		},
		{
			message:
				"day_meal notes require date and mealType; food_entry notes require foodEntryId",
		},
	);

export type CreateNoteRequest = z.input<typeof CreateNoteRequestSchema>;

export const UpdateNoteRequestSchema = z.object({
	id: z.string(),
	value: z.string().optional(),
	isCheckbox: z.boolean().optional(),
	isChecked: z.boolean().optional(),
	displayOrder: z.number().optional(),
});

export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;

export const DeleteNoteRequestSchema = z.object({
	id: z.string(),
});

export type DeleteNoteRequest = z.infer<typeof DeleteNoteRequestSchema>;

// Response schemas
export const FetchNotesResponseSchema = z.object({
	success: z.boolean(),
	error: z.string().optional(),
	notes: z.array(NoteSchema),
});

export type FetchNotesResponse = z.infer<typeof FetchNotesResponseSchema>;

export const CreateNoteResponseSchema = z.object({
	success: z.boolean(),
	error: z.string().optional(),
	note: NoteSchema.optional(),
	message: z.string().optional(),
});

export type CreateNoteResponse = z.infer<typeof CreateNoteResponseSchema>;

export const UpdateNoteResponseSchema = z.object({
	success: z.boolean(),
	error: z.string().optional(),
	note: NoteSchema.optional(),
	message: z.string().optional(),
});

export type UpdateNoteResponse = z.infer<typeof UpdateNoteResponseSchema>;

export const DeleteNoteResponseSchema = z.object({
	success: z.boolean(),
	error: z.string().optional(),
	message: z.string().optional(),
});

export type DeleteNoteResponse = z.infer<typeof DeleteNoteResponseSchema>;
