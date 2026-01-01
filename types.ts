import { FatSecretFood, FatSecretServing } from "@/lib/server/fat-secret/types";

import { Database } from "./database.types";

// Database
export type Tables<T extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
	Database["public"]["Enums"][T];

export type FoodRow = Tables<"food">;
export type ServingRow = Tables<"serving">;
export type IngredientRow = Tables<"ingredient">;
export type InstructionRow = Tables<"instruction">;
export type RecipeRow = Tables<"recipe">;
export type RecipeMacrosRow =
	Database["public"]["Views"]["recipe_macros"]["Row"];
export type FoodEntryRow = Tables<"food_entry">;

export type ExpandedIngredient = Omit<
	IngredientRow,
	"user_id" | "recipe_id"
> & {
	food: FoodRow | null; // should technically never be null
	serving: ServingRow | null; // should technically never be null
};

export type ExpandedRecipe = Omit<RecipeRow, "user_id"> & {
	ingredient: ExpandedIngredient[];
	instruction: Omit<InstructionRow, "user_id">[];
	macros: RecipeMacrosRow[];
};

export type Profile = Database["public"]["Tables"]["profile"]["Row"];

export type MealType = Database["public"]["Enums"]["meal_type_enum"];

export type ExpandedFood = FoodRow & { serving: ServingRow[] };

// Custom
export type FatSecretIngredient = {
	food: FatSecretFood;
	serving: FatSecretServing;
	meta?: string | null;
	originalName?: string;
	number_of_servings: number;
};
