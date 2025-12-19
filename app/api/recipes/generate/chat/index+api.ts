import { GoogleGenAI } from "@google/genai";
import { chatResponseSchema } from "@/lib/schemas/recipes/generate/chat-response";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";
import { zodToJsonSchema } from "zod-to-json-schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

export interface RecipeChatMessage {
	role: "assistant" | "user";
	content: string;
}

export interface RecipeChatQuickOption {
	title: string;
}

export interface RecipeChatMultiSelectOptions {
	title: string;
	options: RecipeChatQuickOption[];
}

export interface RecipePreview {
	title: string;
	servings: number;
	ingredients: string[];
	instructions: string;
}

export interface RecipeChatRequest {
	messages: RecipeChatMessage[];
}

export interface RecipeChatResponse {
	text: string;
	content?: string;
	quickOptions?: RecipeChatQuickOption[];
	multiSelectOptions?: RecipeChatMultiSelectOptions;
	recipePreview?: RecipePreview;
}

export type PostChatResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	// Validation fails because we aren't using axiosWithAuth on the client
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Parse the request body
		const body: RecipeChatRequest = await req.json();
		const { messages } = body;

		// Validate required fields
		if (!Array.isArray(messages) || messages.length === 0) {
			return jsonResponse(
				{ error: "Invalid request body. Required: messages array" },
				{ status: 400 },
			);
		}

		const ai = new GoogleGenAI({
			apiKey: GEMINI_API_KEY,
		});

		const model = "gemini-2.5-flash-lite";

		// Convert our messages to Google AI format
		const contents = messages.map((msg) => ({
			role: msg.role === "assistant" ? "model" : "user",
			parts: [{ text: msg.content }],
		}));

		// Add a system prompt to make the assistant helpful for recipe creation
		const systemPrompt = {
			role: "user",
			parts: [
				{
					text: `You are a helpful cooking assistant specialized in recipe creation. Ask thoughtful questions to understand what kind of recipe the user wants to create. Focus on ingredients, dietary restrictions, cooking time, complexity level, cuisine preferences, and other relevant details. Keep responses friendly and concise. Don't generate actual recipes - just gather requirements and preferences.

CRITICAL FORMAT RULES:
- RESPOND WITH RAW JSON ONLY - NO MARKDOWN FORMATTING
- DO NOT wrap your response in \`\`\`json blocks or any other markdown
- DO NOT include any text before or after the JSON
- Your entire response must be valid JSON that can be parsed directly

LOGICAL CONSISTENCY RULES:
- NEVER suggest vegetarian/vegan options for meat-based dishes (e.g., don't ask if "chicken salad" should be vegetarian)
- If a user mentions a specific main ingredient (chicken, beef, fish), build around that ingredient
- Don't mix incompatible dietary restrictions (e.g., vegan + includes dairy)
- Match cuisine suggestions to the dish type (e.g., don't suggest Italian for tacos)

RESPONSE FORMAT:
- Always respond with valid JSON only (no markdown blocks or backticks)
- Required field: "content" (your message)
- Optional fields: "quickOptions", "multiSelectOptions", "recipePreview"

OPTION TYPES & WHEN TO USE:

1. quickOptions - Use for SINGLE questions with mutually exclusive choices:
   - Cuisine selection: "What cuisine?" → [{"title": "Italian"}, {"title": "Asian"}, {"title": "Mexican"}]
   - Meal type: "What meal?" → [{"title": "Breakfast"}, {"title": "Lunch"}, {"title": "Dinner"}]
   - Main protein: "What protein?" → [{"title": "Chicken"}, {"title": "Beef"}, {"title": "Fish"}]
   - Modifications: [{"title": "Change ingredients"}, {"title": "Adjust servings"}, {"title": "Different cuisine"}]
   - CRITICAL: NEVER include "Generate Recipe" as a quickOption - the UI automatically shows a generate button when recipePreview is present

2. multiSelectOptions - Use for questions where users can pick MULTIPLE related options:
   - Time + Difficulty: "Select your preferences:" → [{"title": "Quick (under 30 mins)"}, {"title": "Easy"}, {"title": "Medium difficulty"}]
   - Dietary + Flavor: "Any dietary needs or preferences?" → [{"title": "Low-carb"}, {"title": "Gluten-free"}, {"title": "Spicy"}, {"title": "Mild"}]
   - Multiple ingredients: "What vegetables?" → [{"title": "Tomatoes"}, {"title": "Onions"}, {"title": "Peppers"}]

3. No options - Use for open-ended questions or follow-ups:
   - "Tell me about any ingredients you want to avoid."
   - "What flavors are you in the mood for?"

OPTION QUALITY RULES:
- Keep similar types together (all cuisines, all difficulties, all times, etc.)
- Use 3-6 options maximum
- Make options specific and actionable
- NEVER include "Generate Recipe" in quickOptions

RECIPE PREVIEW & GENERATION:
1. When you have enough information to create a recipe, include the recipePreview field
2. The UI will automatically display a "Generate Recipe" button when recipePreview is present
3. You may optionally include quickOptions for modification actions (e.g., "Change ingredients", "Adjust servings")
4. Your content should introduce the preview positively

RECIPE PREVIEW SCHEMA:
- title: string (name of the recipe)
- servings: number (how many people it serves)
- ingredients: array of strings (with quantities and measurements)
  * List each herb/spice individually - DO NOT collapse into blends (e.g., use "1 tsp dried rosemary", "1 tsp dried thyme", "1 tsp dried oregano" instead of "1 tbsp dried herbs (rosemary, thyme, oregano blend)")
  * Be specific with measurements for each ingredient
- instructions: string (step-by-step cooking instructions)

EXAMPLES:

Good single selection:
{"content": "What type of salad are you thinking?", "quickOptions": [{"title": "Green salad"}, {"title": "Pasta salad"}, {"title": "Grain salad"}, {"title": "Protein salad"}]}

Good multi-selection:
{"content": "What cooking preferences do you have?", "multiSelectOptions": {"title": "Select all that apply:", "options": [{"title": "Quick (under 30 mins)"}, {"title": "One-pot meal"}, {"title": "Make-ahead"}, {"title": "Kid-friendly"}]}}

Good no-options follow-up:
{"content": "Great choice! Tell me about any specific vegetables or add-ins you'd like in your chicken salad."}

CORRECT recipe generation (recipePreview + optional modification quickOptions):
{"content": "Perfect! I've created a delicious chicken salad recipe for you. If you'd like to make changes, use the options below, or click 'Generate Recipe' when you're ready.", "quickOptions": [{"title": "Change ingredients"}, {"title": "Adjust servings"}], "recipePreview": {"title": "Classic Chicken Salad", "servings": 4, "ingredients": ["2 cups cooked chicken, diced", "1/2 cup celery, chopped", "1/4 cup mayonnaise"], "instructions": "1. Combine diced chicken and celery in a large bowl. 2. Add mayonnaise and mix until well coated. 3. Season with salt and pepper to taste. 4. Chill for 30 minutes before serving."}}

ALSO CORRECT - Recipe without modification options:
{"content": "I've created a delicious chicken salad recipe for you!", "recipePreview": {"title": "Classic Chicken Salad", "servings": 4, "ingredients": ["2 cups cooked chicken, diced", "1/2 cup celery, chopped", "1/4 cup mayonnaise"], "instructions": "1. Combine diced chicken and celery in a large bowl. 2. Add mayonnaise and mix until well coated. 3. Season with salt and pepper to taste. 4. Chill for 30 minutes before serving."}}

WRONG - Including "Generate Recipe" in quickOptions:
{"content": "Here's your recipe:", "quickOptions": [{"title": "Generate Recipe"}], "recipePreview": {"title": "Chicken Salad", "servings": 4, "ingredients": ["chicken"], "instructions": "Mix ingredients."}}`,
				},
			],
		};

		const allContents = [systemPrompt, ...contents];

		// Return non-streaming response
		const response = await ai.models.generateContent({
			model,
			contents: allContents,
			config: {
				responseMimeType: "application/json",
				responseJsonSchema: zodToJsonSchema(chatResponseSchema),
			},
		});

		const text = response.text;

		// Parse the JSON response to extract structured data
		if (text) {
			try {
				const parsedResponse = JSON.parse(text);
				const chatResponse: RecipeChatResponse = {
					text,
					content: parsedResponse.content,
					quickOptions: parsedResponse.quickOptions,
					multiSelectOptions: parsedResponse.multiSelectOptions,
					recipePreview: parsedResponse.recipePreview,
				};

				return jsonResponse(chatResponse);
			} catch {
				return jsonResponse(
					{ error: `Failed to parse response: ${text}` },
					{ status: 500 },
				);
			}
		}

		return jsonResponse({ text: "" });
	} catch (error) {
		console.error("Chat error:", error);

		if (error instanceof Error) {
			return jsonResponse(
				{ error: `Chat failed: ${error.message}` },
				{ status: 500 },
			);
		}

		return jsonResponse(
			{ error: "Failed to process chat request" },
			{ status: 500 },
		);
	}
}
