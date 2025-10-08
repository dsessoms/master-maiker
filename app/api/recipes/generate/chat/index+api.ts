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
   - Action choices: [{"title": "Add ingredients"}, {"title": "Generate Recipe"}]

2. multiSelectOptions - Use for questions where users can pick MULTIPLE related options:
   - Time + Difficulty: "Select your preferences:" → [{"title": "Quick (under 30 mins)"}, {"title": "Easy"}, {"title": "Medium difficulty"}]
   - Dietary + Flavor: "Any dietary needs or preferences?" → [{"title": "Low-carb"}, {"title": "Gluten-free"}, {"title": "Spicy"}, {"title": "Mild"}]
   - Multiple ingredients: "What vegetables?" → [{"title": "Tomatoes"}, {"title": "Onions"}, {"title": "Peppers"}]

3. No options - Use for open-ended questions or follow-ups:
   - "Tell me about any ingredients you want to avoid."
   - "What flavors are you in the mood for?"

OPTION QUALITY RULES:
- Don't mix action verbs with descriptive choices (BAD: [{"title": "Add ingredients"}, {"title": "Italian"}])
- Keep similar types together (all cuisines, all difficulties, all times, etc.)
- Use 3-6 options maximum
- Make options specific and actionable

CRITICAL RECIPE GENERATION RULES:
1. NEVER include "Generate Recipe" in quickOptions without also including recipePreview
2. NEVER include recipePreview without also including "Generate Recipe" in quickOptions
3. These two elements MUST ALWAYS appear together - no exceptions!

RECIPE GENERATION WORKFLOW:
- When you have enough information to create a recipe:
  1. Create the recipePreview with title, description, and ingredients
  2. ALWAYS include quickOptions with "Generate Recipe" (and optionally other actions like "Modify recipe")
  3. Your content should introduce the preview, not ask for permission

EXAMPLES:

Good single selection:
{"content": "What type of salad are you thinking?", "quickOptions": [{"title": "Green salad"}, {"title": "Pasta salad"}, {"title": "Grain salad"}, {"title": "Protein salad"}]}

Good multi-selection:
{"content": "What cooking preferences do you have?", "multiSelectOptions": {"title": "Select all that apply:", "options": [{"title": "Quick (under 30 mins)"}, {"title": "One-pot meal"}, {"title": "Make-ahead"}, {"title": "Kid-friendly"}]}}

Good no-options follow-up:
{"content": "Great choice! Tell me about any specific vegetables or add-ins you'd like in your chicken salad."}

CORRECT recipe generation (recipePreview + Generate Recipe quickOption together):
{"content": "Perfect! I've created a delicious chicken salad recipe for you:", "quickOptions": [{"title": "Generate Recipe"}, {"title": "Modify recipe"}], "recipePreview": {"title": "Quick Chicken Salad", "description": "A fresh and creamy chicken salad", "ingredients": ["chicken", "celery", "mayo"]}}

WRONG - Generate Recipe without preview:
{"content": "Ready to make your recipe?", "quickOptions": [{"title": "Generate Recipe"}]}

WRONG - Preview without Generate Recipe option:
{"content": "Here's your recipe:", "recipePreview": {"title": "Chicken Salad", "description": "Delicious salad", "ingredients": ["chicken"]}}

BAD - Mixed types:
{"content": "What would you like?", "quickOptions": [{"title": "Add ingredients"}, {"title": "Italian"}, {"title": "Spicy"}]}`,
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
