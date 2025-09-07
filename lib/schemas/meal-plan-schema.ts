import { FoodItemEntrySchema, RecipeEntrySchema } from "./food-entry";

import { NoteEntrySchema } from "./note";
import { RecipeSchema } from "./recipe-schema";
import { z } from "zod";

export const GeneratorOutputSchema = z.object({
	recipes: z.array(RecipeSchema),
	note_entries: z.array(NoteEntrySchema.omit({ user_id: true, id: true })),
	food_entries: z.array(
		z.union([
			RecipeEntrySchema.omit({ user_id: true }),
			FoodItemEntrySchema.omit({ user_id: true }),
		]),
	),
});
export type GeneratedMealPlanOutput = z.infer<typeof GeneratorOutputSchema>;
