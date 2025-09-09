import { z } from "zod";

export const NoteSchema = z.object({
	value: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;

export const NoteEntrySchema = z.object({
	id: z.string(),
	user_id: z.string(),
	note: NoteSchema,
	date: z.coerce.date(),
});
export type NoteEntry = z.infer<typeof NoteEntrySchema>;
