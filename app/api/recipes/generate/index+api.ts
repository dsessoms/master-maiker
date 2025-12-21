import {
	RecipePromptOptions,
	RecipePromptOptionsSchema,
} from "@/lib/schemas/recipes/generate/form-input-schema";
import {
	Spoonacular,
	convertSpoonacularRecipeToRecipe,
} from "@/lib/server/spoonacular/spoonacular-helper";

import { GoogleGenAI } from "@google/genai";
import { Recipe } from "@/lib/schemas/recipes/recipe-schema";
import { SpoonacularAnalyzeRecipeSchema } from "@/lib/schemas";
import { generateRecipePrompt } from "@/prompts/generate-recipe-prompt";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

async function generateRecipeWithGoogleAI(options: RecipePromptOptions) {
	const ai = new GoogleGenAI({
		apiKey: GEMINI_API_KEY,
	});
	const config = {
		responseMimeType: "text/plain",
	};
	const model = "gemini-2.5-flash-lite";

	// Generate the prompt using the options
	const prompt = generateRecipePrompt(options);

	const contents = [
		{
			role: "user",
			parts: [
				{
					text: prompt,
				},
			],
		},
	];

	const response = await ai.models.generateContentStream({
		model,
		config,
		contents,
	});
	let result = "";
	for await (const chunk of response) {
		result += chunk.text;
	}

	// Remove code block markers (backticks) and any leading/trailing whitespace, but keep curly braces
	result = result.replace(/^```json[\s\n]*/i, "");
	result = result.replace(/^```[\s\n]*/i, "");
	result = result.replace(/```\s*$/i, "");
	result = result.trim();

	// Parse JSON
	try {
		const recipe = SpoonacularAnalyzeRecipeSchema.parse(JSON.parse(result));
		return recipe;
	} catch (e) {
		throw new Error(
			`Failed to parse JSON from AI response: ${result}. Error: ${e}`,
		);
	}
}

export type PostGeneratedRecipeResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ recipe: undefined }, { status: 401 });
	}

	try {
		// Parse the request body
		const body = await req.json();

		// Validate using Zod schema
		const validationResult = RecipePromptOptionsSchema.safeParse(body);

		if (!validationResult.success) {
			return jsonResponse(
				{
					recipe: undefined,
					error: "Invalid request body",
					details: validationResult.error.errors,
				},
				{ status: 400 },
			);
		}

		const options: RecipePromptOptions = validationResult.data;

		// Step 1: Generate recipe with Google AI
		const aiRecipe = await generateRecipeWithGoogleAI(options);

		// Step 2: Use Spoonacular to analyze the recipe (adds nutrition info)
		const spoonacularRecipe = await Spoonacular.analyzeRecipe({
			recipe: aiRecipe,
		});

		// Step 3: Convert to our Recipe format
		const recipe: Recipe = convertSpoonacularRecipeToRecipe(spoonacularRecipe);

		return jsonResponse({ recipe });
	} catch (error) {
		console.error("Recipe generation error:", error);

		// Return specific error messages for different failure points
		if (error instanceof Error) {
			if (error.message.includes("Failed to parse JSON")) {
				return jsonResponse(
					{
						recipe: undefined,
						error: "AI generated invalid recipe format",
					},
					{ status: 500 },
				);
			}
			if (error.message.includes("Spoonacular")) {
				return jsonResponse(
					{
						recipe: undefined,
						error: "Failed to analyze recipe nutrition",
					},
					{ status: 500 },
				);
			}
		}

		return jsonResponse(
			{
				recipe: undefined,
				error: "Failed to generate recipe",
			},
			{ status: 500 },
		);
	}
}
