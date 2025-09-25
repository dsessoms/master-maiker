import { SpoonacularAnalyzeRecipeSchema } from "@/lib/schemas";
import { zodToJsonSchema } from "zod-to-json-schema";

export interface RecipePromptOptions {
	ingredientsToInclude: string[];
	ingredientsToExclude: string[];
	complexity: "simple" | "moderate" | "complex";
	additionalRequirements?: string;
	chatContent?: string; // New field for chat-based generation
}

export const generateRecipePrompt = (options: RecipePromptOptions) => {
	const { chatContent } = options;

	// If chatContent is provided, use chat-based prompt and ignore other options
	if (chatContent) {
		let prompt = `Based on the following conversation with a user, create a delicious and well-balanced recipe that addresses all their requirements and preferences:

CONVERSATION:
${chatContent}

Please analyze the conversation to understand:
- What type of dish the user wants
- Any specific ingredients they mentioned
- Dietary restrictions or preferences
- Cooking time constraints
- Skill level preferences
- Complexity/difficulty preferences
- Any other requirements mentioned

RECIPE GUIDELINES:
- Provide clear, step-by-step instructions
- Include accurate serving size information
- List all ingredients with specific quantities and measurements
- Ensure the recipe is practical and achievable
- Consider dietary balance and nutritional value
- Make sure cooking times and temperatures are accurate
- NO markdown code blocks or backticks

Please return the recipe in the following JSON format:`;

		prompt += `
${JSON.stringify(
	zodToJsonSchema(SpoonacularAnalyzeRecipeSchema, "output").definitions?.[
		"output"
	],
	null,
	2,
)}`;

		return prompt;
	}

	// Original prompt structure for form-based input
	const {
		ingredientsToInclude = [],
		ingredientsToExclude = [],
		complexity,
		additionalRequirements,
	} = options;

	const complexityDescriptions = {
		simple:
			"Easy to make with minimal cooking techniques, requiring 30 minutes or less, and using basic kitchen equipment.",
		moderate:
			"Intermediate difficulty with some cooking techniques, taking 30-60 minutes, and may require specialized equipment.",
		complex:
			"Advanced cooking techniques, multiple steps, taking over 60 minutes, and may require professional-level skills or equipment.",
	};

	let prompt = `Create a delicious and well-balanced recipe with the following requirements:

INGREDIENT REQUIREMENTS:
${
	ingredientsToInclude.length > 0
		? `- MUST include these ingredients: ${ingredientsToInclude.join(", ")}`
		: "- No specific ingredients required to include"
}
${
	ingredientsToExclude.length > 0
		? `- MUST NOT include these ingredients: ${ingredientsToExclude.join(", ")}`
		: "- No ingredient restrictions"
}

COMPLEXITY LEVEL: ${complexity}
- ${complexityDescriptions[complexity]}`;

	if (additionalRequirements) {
		prompt += `

ADDITIONAL REQUIREMENTS:
${additionalRequirements}`;
	}

	prompt += `

RECIPE GUIDELINES:
- Provide clear, step-by-step instructions
- Include accurate serving size information
- List all ingredients with specific quantities and measurements
- Ensure the recipe is practical and achievable
- Consider dietary balance and nutritional value
- Make sure cooking times and temperatures are accurate
- NO markdown code blocks or backticks

Please return the recipe in the following JSON format:`;

	prompt += `
${JSON.stringify(
	zodToJsonSchema(SpoonacularAnalyzeRecipeSchema, "output").definitions?.[
		"output"
	],
	null,
	2,
)}`;

	return prompt;
};
