import { GoogleGenAI } from "@google/genai";
import { IngredientSchema } from "@/lib/schemas";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

/**
 * Parses an ingredient string using Google AI (Gemini, PaLM, etc.).
 * @param {string} input - The ingredient string to parse.
 * @return {Promise<object>} resolving to the parsed ingredient object.
 */
async function parseIngredientWithGoogleAI(input: string) {
	const ai = new GoogleGenAI({
		apiKey: GEMINI_API_KEY,
	});
	const config = {
		responseMimeType: "text/plain",
	};
	const model = "gemini-2.0-flash-lite";
	const contents = [
		{
			role: "user",
			parts: [
				{
					text: `\`\`\`
interface Serving {
  measurementDescription: string; // cup
  numberOfUnits: number; // 1
  calories: number;
  carbohydrateGrams: number;
  fatGrams: number;
  proteinGrams: number;
}

interface Ingredient {
  type: "ingredient";
  name: string;
  meta?: string;
  numberOfServings: number;
  serving: Serving;
}
\`\`\`
Using the object structure defined above, turn the string "${input}" into an Ingredient object using your best estimates for macros. 
Only include a meta string if the input string needs the meta parsed out of it (e.g. "yellow or red" for "1 bell pepper (yellow or red). 
Fallback to the ingredient name if a better measurementDescription cannot be parsed. 
Prefer to use the measurementDescription as a single word (e.g. "cup" instead of "cups").
Your entire response should be a single JSON object, and you should NOT wrap it within JSON markdown markers.
`,
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
		const ingredient = IngredientSchema.parse(JSON.parse(result));
		return ingredient;
	} catch (e) {
		throw new Error(
			`Failed to parse JSON from AI response: ${result}. Error: ${e}`,
		);
	}
}

export type GetParsedIngredientResponse = Awaited<ReturnType<typeof GET>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	// Extract the ingredient query parameter from the URL
	const url = new URL(req.url);
	const ingredient = url.searchParams.get("ingredient");

	if (!ingredient) {
		return jsonResponse(
			{ error: "Missing 'ingredient' query parameter" },
			{ status: 400 },
		);
	}

	try {
		const parsedIngredient = await parseIngredientWithGoogleAI(ingredient);
		return jsonResponse(parsedIngredient);
	} catch (error) {
		console.log(error);
		return jsonResponse(
			{
				error:
					error instanceof Error ? error.message : "Failed to parse ingredient",
			},
			{ status: 500 },
		);
	}
}
