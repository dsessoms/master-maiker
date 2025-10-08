import { GoogleGenAI, Type } from "@google/genai";

import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

export interface ChatMessage {
	role: "assistant" | "user";
	content: string;
}

export interface ChatRequest {
	messages: ChatMessage[];
	stream?: boolean;
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
		const body: ChatRequest = await req.json();
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

CRITICAL: When asking about multiple related topics (like "cooking time AND difficulty" or "dietary restrictions AND spice preferences"), ALWAYS use multiSelectOptions so users can answer everything at once instead of being forced to choose just one aspect.

RESPONSE FORMAT:
- Always respond with valid JSON only (no markdown blocks or backticks)
- Required field: "content" (your message)
- Optional fields: "quickOptions" (array of choice objects), "recipePreview" (when ready to generate)

QUICK OPTIONS:
- Use when questions have clear, limited choices (difficulty, cuisine, dietary restrictions, etc.)
- Single select format: [{"title": "Option 1"}, {"title": "Option 2"}] - use ONLY when asking ONE question
- Multi-select format: Use "multiSelectOptions" field when asking multiple questions or when options can overlap
  * Examples: cooking time + difficulty, dietary restrictions + flavor preferences, multiple ingredients
  * Format: {"title": "Select all that apply:", "options": [{"title": "Quick (under 30 mins)"}, {"title": "Easy"}, {"title": "Vegetarian"}, {"title": "Spicy"}]}
- IMPORTANT: If you ask multiple questions in one response, ALWAYS use multiSelectOptions so users can answer everything at once
- Limit to 3-6 options total to avoid overwhelming users
- Include "Generate Recipe" option when sufficient information is gathered

RECIPE GENERATION:
- When you have enough information to create a recipe, automatically include "recipePreview" with title, description, and ingredients list
- DO NOT ask for confirmation before showing the preview - just show it directly
- Always offer "Generate Recipe" as a quickOption when recipe preview is shown
- Your content message should describe what you've created, not ask permission to show it

EXAMPLES:
Single question: {"content": "What cuisine are you interested in?", "quickOptions": [{"title": "Italian"}, {"title": "Asian"}, {"title": "Mexican"}]}

Multiple questions (CORRECT): {"content": "What's your preferred cooking time and difficulty level?", "multiSelectOptions": {"title": "Select all that apply:", "options": [{"title": "Quick (under 30 mins)"}, {"title": "Medium (30-60 mins)"}, {"title": "No time limit"}, {"title": "Easy"}, {"title": "Medium difficulty"}, {"title": "Hard"}]}}

Dietary preferences: {"content": "What dietary preferences and flavor profiles interest you?", "multiSelectOptions": {"title": "Select all that apply:", "options": [{"title": "Vegetarian"}, {"title": "Vegan"}, {"title": "Spicy"}, {"title": "Low-carb"}]}}

Ready to generate: {"content": "Perfect! Based on your preferences, I've created a delicious vegetarian Italian mushroom risotto for you.", "quickOptions": [{"title": "Generate Recipe"}], "recipePreview": {"title": "Creamy Mushroom Risotto", "description": "A rich and creamy Italian risotto featuring mixed mushrooms", "ingredients": ["arborio rice", "mixed mushrooms", "vegetable broth", "white wine", "parmesan cheese", "onion", "garlic", "olive oil"]}}

Simple response: {"content": "Tell me more about your dietary preferences."}`,
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
				responseSchema: {
					type: Type.OBJECT,
					required: ["content"],
					properties: {
						content: {
							type: Type.STRING,
						},
						quickOptions: {
							type: Type.ARRAY,
							items: {
								type: Type.OBJECT,
								required: ["title"],
								properties: {
									title: {
										type: Type.STRING,
									},
								},
							},
						},
						multiSelectOptions: {
							type: Type.OBJECT,
							required: ["title", "options"],
							properties: {
								title: {
									type: Type.STRING,
								},
								options: {
									type: Type.ARRAY,
									items: {
										type: Type.OBJECT,
										required: ["title"],
										properties: {
											title: {
												type: Type.STRING,
											},
										},
									},
								},
							},
						},
						recipePreview: {
							type: Type.OBJECT,
							required: ["title", "description", "ingredients"],
							properties: {
								title: {
									type: Type.STRING,
								},
								description: {
									type: Type.STRING,
								},
								ingredients: {
									type: Type.ARRAY,
									items: {
										type: Type.STRING,
									},
								},
							},
						},
					},
				},
			},
		});

		const text = response.text;

		// Parse the JSON response to extract structured data
		if (text) {
			try {
				const parsedResponse = JSON.parse(text);
				return jsonResponse({
					text,
					content: parsedResponse.content,
					quickOptions: parsedResponse.quickOptions,
					multiSelectOptions: parsedResponse.multiSelectOptions,
					recipePreview: parsedResponse.recipePreview,
				});
			} catch {
				// Fallback to returning just the text if parsing fails
				return jsonResponse({ text });
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
