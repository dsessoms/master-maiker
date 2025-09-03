import { FoodItemEntrySchema, RecipeEntrySchema } from "./food-entry";

import { NoteEntrySchema } from "./note";
import { RecipeSchema } from "./recipe-schema";
import { z } from "zod";

export const GeneratorOutputSchema = z.object({
	recipes: z.array(
		RecipeSchema.omit({ userId: true, updatedAt: true, createdAt: true }),
	),
	noteEntries: z.array(NoteEntrySchema.omit({ userId: true, id: true })),
	foodEntries: z.array(
		z.union([
			RecipeEntrySchema.omit({ userId: true }),
			FoodItemEntrySchema.omit({ userId: true }),
		]),
	),
});
export type GeneratedMealPlanOutput = z.infer<typeof GeneratorOutputSchema>;
