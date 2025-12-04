import { z } from "zod";

export const quickOptionSchema = z.object({
	title: z
		.string()
		.describe(
			"Quick action option. NEVER use 'Generate Recipe' as a title - the UI will automatically show a generate button when recipePreview is present.",
		),
});

export const multiSelectOptionSchema = z.object({
	title: z.string(),
});

export const multiSelectOptionsSchema = z.object({
	title: z.string(),
	options: z.array(multiSelectOptionSchema),
});

export const recipePreviewSchema = z
	.object({
		title: z.string().describe("Name of the recipe"),
		servings: z.number().describe("Number of servings"),
		ingredients: z
			.array(z.string())
			.describe(
				"List of ingredients with quantities and measurements. List each herb/spice individually.",
			),
		instructions: z.string().describe("Step-by-step cooking instructions"),
	})
	.describe(
		"Recipe preview. When this field is present, the UI will automatically display a 'Generate Recipe' button.",
	);

export const chatResponseSchema = z.object({
	content: z.string().describe("The assistant's message to the user"),
	quickOptions: z
		.array(quickOptionSchema)
		.optional()
		.describe(
			"Single-selection options for mutually exclusive choices. Do NOT include 'Generate Recipe' here.",
		),
	multiSelectOptions: multiSelectOptionsSchema
		.optional()
		.describe(
			"Multi-selection options where users can pick multiple related options",
		),
	recipePreview: recipePreviewSchema
		.optional()
		.describe(
			"Recipe preview. Including this field signals the UI to show a 'Generate Recipe' button.",
		),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type QuickOption = z.infer<typeof quickOptionSchema>;
export type MultiSelectOptions = z.infer<typeof multiSelectOptionsSchema>;
export type RecipePreview = z.infer<typeof recipePreviewSchema>;
