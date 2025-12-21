import { z } from "zod";

export const RecipePromptOptionsSchema = z.object({
	ingredientsToInclude: z.array(z.string()),
	ingredientsToExclude: z.array(z.string()),
	complexity: z.enum(["simple", "moderate", "complex"]),
	additionalRequirements: z.string().optional(),
});

export type RecipePromptOptions = z.infer<typeof RecipePromptOptionsSchema>;
