import { Database } from "@/database.types";

// Type helpers for expanded recipe and food data
export type ExpandedRecipe = Database["public"]["Tables"]["recipe"]["Row"] & {
	ingredients?: (Database["public"]["Tables"]["ingredient"]["Row"] & {
		food: Database["public"]["Tables"]["food"]["Row"] | null;
		serving: Database["public"]["Tables"]["serving"]["Row"] | null;
	})[];
};

export type ExpandedFood = Database["public"]["Tables"]["food"]["Row"] & {
	serving: Database["public"]["Tables"]["serving"]["Row"][];
};

export interface IngredientMap {
	[key: string]: boolean;
}

export interface RecipeMap {
	[recipeId: string]: {
		recipe: ExpandedRecipe;
		numberOfServings: number;
		ingredientMap: IngredientMap;
	};
}

export interface FoodServingMap {
	[servingId: string]: {
		food: ExpandedFood;
		numberOfServings: number;
		include: boolean;
	};
}

export interface AddShoppingItemsData {
	recipes?: { recipeId: string; numberOfServings: number }[];
	foods?: { foodId: string; servingId: string; numberOfServings: number }[];
}
