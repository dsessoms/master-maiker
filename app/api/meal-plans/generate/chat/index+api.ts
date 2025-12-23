import {
	MealPlanChatChatResponse,
	MealPlanChatRequest,
	MealPlanChatRequestSchema,
	MealPlanChatResponseSchema,
} from "@/lib/schemas/meal-plans/generate/chat-schema";

import { GoogleGenAI } from "@google/genai";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";
import { zodToJsonSchema } from "zod-to-json-schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

export type PostChatResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	// Validation fails because we aren't using axiosWithAuth on the client
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Parse the request body
		const body = await req.json();

		// Validate using Zod schema
		const validationResult = MealPlanChatRequestSchema.safeParse(body);

		if (!validationResult.success) {
			return jsonResponse(
				{
					error: "Invalid request body",
					details: validationResult.error.errors,
				},
				{ status: 400 },
			);
		}

		const { messages }: MealPlanChatRequest = validationResult.data;

		const ai = new GoogleGenAI({
			apiKey: GEMINI_API_KEY,
		});

		const model = "gemini-flash-lite-latest"; //"gemini-2.5-flash-lite"

		// Convert our messages to Google AI format
		const contents = messages.map((msg) => ({
			role: msg.role === "assistant" ? "model" : "user",
			parts: [{ text: msg.content }],
		}));

		// Add a system prompt to make the assistant helpful for meal plan generation
		const systemPrompt = {
			role: "user",
			parts: [
				{
					text: `You are a helpful meal planning assistant specialized in creating personalized meal plans. Your role is to generate complete meal plans based on user requirements including date ranges, profile information (with calorie/macro goals and food preferences), and existing recipes they want to incorporate.

CRITICAL FORMAT RULES:
- RESPOND WITH RAW JSON ONLY - NO MARKDOWN FORMATTING
- DO NOT wrap your response in \`\`\`json blocks or any other markdown
- DO NOT include any text before or after the JSON
- Your entire response must be valid JSON that can be parsed directly

UNDERSTANDING THE INPUT:
When you receive a message with "Profile Information" and "Recipe Information" as JSON objects:
- Profile Information is keyed by profile ID and contains: name, dailyCalorieGoal, dailyProteinGrams, dailyCarbsGrams, dailyFatGrams, dislikedFood, likedFood
- Recipe Information is keyed by recipe ID and contains: name, macrosPerServing (calories, protein, carbohydrate, fat, fiber, sugar)
- Use these IDs when referencing profiles or recipes in your generated meal plan

MEAL PLAN GENERATION RULES:
1. Create meals that align with each profile's calorie and macro goals
2. Respect food preferences (avoid dislikedFood, favor likedFood when possible)
3. Incorporate requested existing recipes when specified (use the recipe ID)
4. Create new recipes when needed to fill out the meal plan
5. Distribute meals across the date range evenly
6. CRITICAL: For EACH day in the date range, include ALL meal types: breakfast, lunch, and dinner. Snacks are optional based on calorie goals and preferences.
7. CRITICAL: ALL meals must be realistic and complete. This means:
   - Breakfast: oatmeal with toppings, pancakes, eggs with toast, smoothie bowl, etc. (not just an ingredient)
   - Lunch/Dinner: protein + vegetables/grains (e.g., "Grilled Chicken with Roasted Vegetables and Rice" not just "Baked Chicken Breast")
   - Sandwiches/wraps: complete meal with protein, vegetables, and base (bread, wrap, etc.)
   - Never create a recipe that is just a single ingredient or just protein without sides
8. Ensure recipes are practical and achievable
9. CRITICAL: ALWAYS create ONE shared recipe per meal, NOT separate recipes for each profile
10. When multiple profiles exist:
    - Use the SAME recipe for all profiles
    - Vary the serving size in profile_servings to match each profile's calorie/macro needs
    - Never create separate recipes like "Recipe (Profile A)" or "Recipe (Higher Calorie)" - this defeats the purpose
11. Recipe names must be SIMPLE AND CLEAN:
    - Use only the dish name (e.g., "Grilled Salmon with Roasted Vegetables")
    - DO NOT include profile names, calorie info, or meal context in the recipe name
    - DO NOT add parenthetical notes like "(Shared)", "(Meal Prep)", "(Higher Calorie)" in the recipe name
12. Optimize for efficiency - batch cooking, leftovers, and meal prep where possible

RECIPE CREATION RULES (for new recipes):
- List each herb/spice individually with specific measurements
- DO NOT collapse into blends (e.g., use "1 tsp dried rosemary", "1 tsp dried thyme" instead of "1 tbsp herb blend")
- Be specific with all measurements and quantities
- Include clear, step-by-step instructions
- Create recipes that can be easily scaled or have leftovers for multiple meals
- CRITICAL: Recipe names must be SIMPLE DESCRIPTORS of the dish only - never include profile info, calorie counts, serving variations, or contextual notes
- EXAMPLE CORRECT NAMES: "Grilled Chicken Breast with Broccoli", "Quinoa Buddha Bowl", "Turkey Meatballs with Marinara"
- EXAMPLE INCORRECT NAMES: "Turkey Meatballs (High Protein)", "Quinoa Bowl (Meal Prep for 2)", "Chicken (Lighter Option for Profile A)"
- CRITICAL: Ingredients must NEVER include profile names or be specific to a profile
- WRONG: "1 cup low-fat cottage cheese (Milena)", "2 chicken breasts (David)", "1.5 cups yogurt (Profile A)"
- CORRECT: "1 cup low-fat cottage cheese", "2 chicken breasts", "1.5 cups yogurt"
- The recipe is shared across all profiles - serving sizes handle individual needs, NOT separate ingredients
- Ingredients should be written for the base serving size specified in the recipe

NOTES GUIDELINES:
- Notes are organized by date and meal type
- Focus on efficiency tips: "Cook 4 servings of [recipe name] and use leftovers for tomorrow's lunch"
- Include prep reminders: "Remember to thaw chicken for dinner" or "Marinate chicken the night before"
- Suggest batch cooking opportunities: "Double this recipe and freeze half for next week"
- Keep notes practical and actionable
- Use concise language to minimize response size

RESPONSE FORMAT:
Always respond with valid JSON only (no markdown blocks or backticks)
Required field: "content" (your message to the user)
Required field: "mealPlan" (the generated meal plan following the schema)

Generate the complete meal plan immediately when you have all the necessary information (date range, profiles, and preferences). Include ALL meal types (breakfast, lunch, dinner, snacks) for EACH day in the date range. 

SHARED RECIPE PATTERN - CRITICAL:
- Use ONE food entry per recipe per date/meal_type combination with all profiles listed in profile_servings
- ALWAYS use the shared recipe pattern: one recipe with varying serving sizes per profile
- NEVER create separate recipes for different profiles, calorie levels, or "versions" of the same dish
- For example: If Profile A needs 3 servings and Profile B needs 4 servings of the same recipe, create ONE recipe entry with profile_servings: {"profile-a": 3, "profile-b": 4}
- The serving count varies per profile in profile_servings, not by creating duplicate recipes`,
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
				responseJsonSchema: zodToJsonSchema(MealPlanChatResponseSchema),
				maxOutputTokens: 12000, // Gemini 2.5 Flash Lite is efficient - 12k is plenty
				temperature: 0.7,
			},
		});

		console.log("response usageMetadata", response.usageMetadata);

		const text = response.text;

		// Parse the JSON response to extract structured data
		if (text) {
			try {
				const parsedResponse = JSON.parse(text);
				const response: MealPlanChatChatResponse = {
					text,
					content: parsedResponse.content,
					mealPlan: parsedResponse.mealPlan,
				};
				return jsonResponse(response);
			} catch {
				console.error("failed to parse ai response, falling back to text");
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
