import {
	RecipePromptOptions,
	generateRecipePrompt,
} from "./generate-recipe-prompt";

// Example 1: Simple vegetarian pasta
const example1: RecipePromptOptions = {
	ingredientsToInclude: ["pasta", "tomatoes", "basil"],
	ingredientsToExclude: ["meat", "fish"],
	complexity: "simple",
	additionalRequirements: "Vegetarian and ready in under 30 minutes",
};

// Example 2: Complex dessert
const example2: RecipePromptOptions = {
	ingredientsToInclude: ["chocolate", "cream"],
	ingredientsToExclude: ["nuts", "gluten"],
	complexity: "complex",
	additionalRequirements:
		"Gluten-free dessert suitable for special occasions. Should be impressive and elegant.",
};

// Example 3: Moderate dinner with dietary restrictions
const example3: RecipePromptOptions = {
	ingredientsToInclude: ["chicken", "vegetables"],
	ingredientsToExclude: ["dairy", "soy"],
	complexity: "moderate",
	additionalRequirements:
		"Dairy-free and soy-free family dinner for 4 people. Include a side dish.",
};

// Generate the prompts
console.log("=== SIMPLE VEGETARIAN PASTA ===");
console.log(generateRecipePrompt(example1));

console.log("\n=== COMPLEX GLUTEN-FREE DESSERT ===");
console.log(generateRecipePrompt(example2));

console.log("\n=== MODERATE FAMILY DINNER ===");
console.log(generateRecipePrompt(example3));
