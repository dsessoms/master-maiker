import {
	GeneratedMealPlan,
	GeneratedMealPlanSchema,
	MealPlanChatChatResponse,
	MealPlanChatRequest,
	MealPlanChatRequestSchema,
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

		const { basicInformation, messages }: MealPlanChatRequest =
			validationResult.data;

		const ai = new GoogleGenAI({
			apiKey: GEMINI_API_KEY,
		});

		// Use gemini-2.0-flash-exp which has better function calling support
		// gemini-flash-lite-latest has issues with function calling
		const model = "gemini-2.0-flash-exp";

		// Build context message from basicInformation
		const profilesInfo = basicInformation.userProfiles
			.map(
				(profile) => `
Profile: ${profile.name} (ID: ${profile.id})
- Daily Calorie Goal: ${profile.dailyCalorieGoal || "Not specified"}
- Daily Protein Goal: ${profile.dailyProteinGoal ? `${profile.dailyProteinGoal}g` : "Not specified"}
- Daily Carbs Goal: ${profile.dailyCarbsGoal ? `${profile.dailyCarbsGoal}g` : "Not specified"}
- Daily Fat Goal: ${profile.dailyFatGoal ? `${profile.dailyFatGoal}g` : "Not specified"}
- Liked Foods: ${profile.likedFood?.join(", ") || "None specified"}
- Disliked Foods: ${profile.dislikedFood?.join(", ") || "None specified"}`,
			)
			.join("\n");

		const contextMessage = `Create a meal plan for ${basicInformation.startDate} to ${basicInformation.endDate}

Profile Information:
${profilesInfo}

${
	basicInformation.recipesToInclude.length > 0
		? `Existing Recipes to Incorporate:
${basicInformation.recipesToInclude.map((r) => `- ${r.name} (ID: ${r.id})${r.calories ? ` - ${r.calories} cal` : ""}${r.protein ? `, ${r.protein}g protein` : ""}${r.carbohydrate ? `, ${r.carbohydrate}g carbs` : ""}${r.fat ? `, ${r.fat}g fat` : ""}`).join("\n")}`
		: ""
}

${basicInformation.additionalContext ? `Additional Context: ${basicInformation.additionalContext}` : ""}`;

		// Convert our messages to Google AI format
		// Prepend the context message as a user message
		const contents = [
			{
				role: "user",
				parts: [{ text: contextMessage }],
			},
			...messages.map((msg) => ({
				role: msg.role === "assistant" ? "model" : "user",
				parts: [{ text: msg.content }],
			})),
		];

		// Add a system prompt to make the assistant helpful for meal plan generation
		const systemInstruction = {
			role: "user",
			parts: [
				{
					text: `You are a helpful meal planning assistant specialized in creating personalized meal plans. Your role is to generate complete meal plans based on user requirements provided in a structured format.

UNDERSTANDING THE INPUT:
You will receive:
1. A context message with structured basic information including:
   - Date range (startDate to endDate)
   - Profile information: name, daily calorie/macro goals (protein, carbs, fat), liked/disliked foods
   - Recipes to incorporate: existing recipes with their IDs and nutritional information
   - Additional context: user preferences or dietary restrictions
2. Conversation messages from the user requesting meal plan generation or modifications

Use the profile ID and recipe IDs when referencing them in your generated meal plan.

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
12. CRITICAL - RECIPE REUSE FOR LEFTOVERS AND MEAL PREP:
    - When using leftovers or meal prep, REUSE THE SAME RECIPE ID - DO NOT create duplicate recipes
    - WRONG: Create "Beef Stir-fry" recipe and then create "Leftover Beef Stir-fry" as a separate recipe
    - CORRECT: Create ONE "Beef Stir-fry" recipe and reference it multiple times in foodEntries with the same recipe_id
    - Example pattern: If Monday dinner is "Grilled Chicken Salad", and Tuesday lunch uses leftovers, both foodEntries should have the same recipe_id pointing to the single "Grilled Chicken Salad" recipe
    - The recipes array should contain UNIQUE recipes only - no duplicates with different names for the same dish
    - Serving sizes can vary between meals using the same recipe via profile_servings
13. Optimize for efficiency - batch cooking, leftovers, and meal prep where possible

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
- When referencing leftovers in notes, mention the original recipe name (not "Leftover X")
- Keep notes practical and actionable
- Use concise language to minimize response size

WHEN TO USE THE FUNCTION:
- When you have all the necessary information to generate a complete meal plan
- When the user requests a meal plan generation or modification
- Always call the function when creating or updating a meal plan

Generate the complete meal plan immediately when you have all the necessary information (date range, profiles, and preferences). Include ALL meal types (breakfast, lunch, dinner, snacks) for EACH day in the date range. 

SHARED RECIPE PATTERN - CRITICAL:
- Use ONE food entry per recipe per date/meal_type combination with all profiles listed in profile_servings
- ALWAYS use the shared recipe pattern: one recipe with varying serving sizes per profile
- NEVER create separate recipes for different profiles, calorie levels, or "versions" of the same dish
- profile_servings is an array of arrays where each inner array contains [profileId, servings]. For example: If Profile A (id: "profile-a") needs 3 servings and Profile B (id: "profile-b") needs 4 servings, use: profile_servings: [["profile-a", 3], ["profile-b", 4]]
- The serving count varies per profile in profile_servings, not by creating duplicate recipes

LEFTOVER AND MEAL PREP PATTERN - CRITICAL:
- When a recipe is used multiple times (leftovers, meal prep), reuse the SAME recipe_id across multiple foodEntries
- DO NOT create duplicate recipes with names like "Leftover X" or "X (Day 2)"
- The recipes array should only contain UNIQUE recipes
- Example CORRECT pattern:
  recipes: [{ id: "recipe-1", name: "Beef Stir-fry", ... }]
  foodEntries: [
    { recipe_id: "recipe-1", date: "2025-01-01", meal_type: "dinner", ... },
    { recipe_id: "recipe-1", date: "2025-01-02", meal_type: "lunch", ... }  // Same recipe_id!
  ]
- Example WRONG pattern:
  recipes: [
    { id: "recipe-1", name: "Beef Stir-fry", ... },
    { id: "recipe-2", name: "Leftover Beef Stir-fry", ... }  // DON'T DO THIS!
  ]`,
				},
			],
		};

		// Define the function declaration for generating meal plans
		// Convert Zod schema to JSON Schema and clean up for Gemini compatibility
		const jsonSchema = zodToJsonSchema(GeneratedMealPlanSchema, {
			target: "openApi3",
			$refStrategy: "none",
		});

		// Remove problematic fields that Gemini doesn't like
		const cleanSchema = JSON.parse(JSON.stringify(jsonSchema));
		delete cleanSchema.$schema;

		// Recursively remove additionalProperties: false which Gemini doesn't like
		function removeAdditionalProperties(obj: any): any {
			if (typeof obj !== "object" || obj === null) return obj;

			if (Array.isArray(obj)) {
				return obj.map(removeAdditionalProperties);
			}

			const result: any = {};
			for (const [key, value] of Object.entries(obj)) {
				if (key === "additionalProperties") continue;
				result[key] = removeAdditionalProperties(value);
			}
			return result;
		}

		const geminiSchema = removeAdditionalProperties(cleanSchema);

		const generateMealPlanFunction = {
			name: "generate_meal_plan",
			description:
				"Generates a complete meal plan with recipes, food entries, and optional notes based on user requirements",
			parameters: geminiSchema,
		};

		// Return non-streaming response with function calling
		const response = await ai.models.generateContent({
			model,
			contents,
			config: {
				systemInstruction,
				tools: [{ functionDeclarations: [generateMealPlanFunction] }],
				maxOutputTokens: 60_000,
				temperature: 0.7,
			},
		});

		// Check for malformed function call
		if (response.candidates?.[0]?.finishReason === "MALFORMED_FUNCTION_CALL") {
			console.error("=== MALFORMED FUNCTION CALL ===");
			console.error(
				"Full candidate:",
				JSON.stringify(response.candidates[0], null, 2),
			);
			console.error(
				"Content parts:",
				JSON.stringify(response.candidates[0].content?.parts, null, 2),
			);
			return jsonResponse(
				{
					error:
						"The AI generated a malformed function call. This may be due to schema complexity or API limitations.",
					details: response.candidates[0],
				},
				{ status: 500 },
			);
		}

		// Check for function calls first (before text)
		const functionCall = response.functionCalls?.[0];

		if (functionCall) {
			try {
				const mealPlan = functionCall.args as GeneratedMealPlan;

				const result: MealPlanChatChatResponse = {
					content:
						"I've generated a complete meal plan for you based on your requirements.",
					mealPlan,
				};
				return jsonResponse(result);
			} catch (funcError) {
				console.error("Failed to process function call:", funcError);
				return jsonResponse(
					{ error: "Failed to process meal plan generation" },
					{ status: 500 },
				);
			}
		}

		const text = response.text;

		// Parse the JSON response to extract structured data
		if (text) {
			try {
				const parsedResponse = JSON.parse(text);
				const response: MealPlanChatChatResponse = {
					content: parsedResponse.content,
					mealPlan: parsedResponse.mealPlan,
				};
				return jsonResponse(response);
			} catch (parseError) {
				console.error("Failed to parse AI response:", parseError);
				// Fallback to returning just the text if parsing fails
				return jsonResponse({ content: text });
			}
		}

		return jsonResponse({ content: "" });
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
