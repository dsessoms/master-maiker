import { z } from "zod";

export const SpoonacularAnalyzeRecipeSchema = z.object({
	title: z.string(),
	servings: z.number(),
	ingredients: z.array(z.string()),
	instructions: z.string(),
});

export type SpoonacularAnalyzeRecipe = z.infer<
	typeof SpoonacularAnalyzeRecipeSchema
>;
