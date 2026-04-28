import { supabase } from "@/config/supabase-server";
import {
	CATALOG_FETCH_LIMIT,
	type GeneratorCandidate,
	type ProfileCalorieTarget,
} from "@/lib/meal-plan-draft/generator";

// ==========================================
// DB row types
// ==========================================

export interface RecipeMacrosRow {
	calories: number | null;
	protein: number | null;
	carbohydrate: number | null;
	fat: number | null;
}

export interface RecipeCandidateRow {
	id: string;
	name: string;
	source: string;
	number_of_servings: number;
	prep_time_hours: number | null;
	prep_time_minutes: number | null;
	image_id: string | null;
	macros: RecipeMacrosRow[];
	recipe_cuisines: { cuisines: { name: string } | null }[];
	recipe_diets: { diets: { name: string } | null }[];
	recipe_dish_types: { dish_types: { name: string } | null }[];
	ingredient: {
		name: string | null;
		type: string;
		food: { spoonacular_id: number | null; food_name: string } | null;
	}[];
}

// ==========================================
// Candidate mapping
// ==========================================

type IngredientRow = RecipeCandidateRow["ingredient"][number];

/**
 * Maps a DB recipe row to the `GeneratorCandidate` shape.
 */
export function mapRowToCandidate(row: RecipeCandidateRow): GeneratorCandidate {
	const macros = row.macros[0] ?? null;

	const caloriesPerServing = macros?.calories ?? 0;
	const proteinPerServing = macros?.protein ?? 0;
	const carbsPerServing = macros?.carbohydrate ?? 0;
	const fatPerServing = macros?.fat ?? 0;

	const prepMinutes =
		(row.prep_time_hours ?? 0) * 60 + (row.prep_time_minutes ?? 0);

	const coreIngredients = row.ingredient.map(
		(i: IngredientRow) => i.food?.food_name as string,
	);

	const spoonacularIngredientIds = row.ingredient
		.filter(
			(i: IngredientRow) =>
				i.type !== "pantry_staple" && i.food?.spoonacular_id != null,
		)
		.map((i: IngredientRow) => i.food!.spoonacular_id as number);

	const cuisineNames = row.recipe_cuisines
		.map((rc) => rc.cuisines?.name ?? "")
		.filter(Boolean);

	const dietNames = row.recipe_diets
		.map((rd) => rd.diets?.name ?? "")
		.filter(Boolean);

	const dishTypeNames = row.recipe_dish_types
		.map((rdt) => rdt.dish_types?.name ?? "")
		.filter(Boolean);

	return {
		id: row.id,
		name: row.name,
		source: row.source === "library" ? "library" : "catalog",
		calories_per_serving: caloriesPerServing,
		macros_per_serving: {
			protein_g: proteinPerServing,
			carbs_g: carbsPerServing,
			fat_g: fatPerServing,
		},
		servings: row.number_of_servings,
		image_id: row.image_id,
		prep_time_minutes: prepMinutes,
		core_ingredients: coreIngredients,
		spoonacular_ingredient_ids: spoonacularIngredientIds,
		cuisine_names: cuisineNames,
		diet_names: dietNames,
		dish_type_names: dishTypeNames,
	};
}

// ==========================================
// Fetch helpers
// ==========================================

const RECIPE_SELECT = `
	id,
	name,
	source,
	number_of_servings,
	prep_time_hours,
	prep_time_minutes,
	image_id,
	macros:recipe_macros (calories, protein, carbohydrate, fat),
	recipe_cuisines (cuisines (name)),
	recipe_diets (diets (name)),
	recipe_dish_types (dish_types (name)),
	ingredient (name, type, food(spoonacular_id, food_name))
`;

/**
 * Fetches all library recipes belonging to the authenticated user.
 */
export async function fetchLibraryRecipes(
	userId: string,
): Promise<GeneratorCandidate[]> {
	const { data, error } = await supabase
		.from("recipe")
		.select(RECIPE_SELECT)
		.eq("user_id", userId);

	if (error || !data) return [];

	return (data as unknown as RecipeCandidateRow[]).map(mapRowToCandidate);
}

/**
 * Fetches a bounded set of catalog recipes.
 */
export async function fetchCatalogRecipes(): Promise<GeneratorCandidate[]> {
	const { data, error } = await supabase
		.from("recipe")
		.select(RECIPE_SELECT)
		.eq("source", "catalog")
		.limit(CATALOG_FETCH_LIMIT);

	if (error || !data) return [];

	return (data as unknown as RecipeCandidateRow[]).map(mapRowToCandidate);
}

/**
 * Deduplicates library + catalog candidates. Library version always wins.
 */
export function deduplicateCandidates(
	library: GeneratorCandidate[],
	catalog: GeneratorCandidate[],
): GeneratorCandidate[] {
	const seen = new Set<string>();
	const result: GeneratorCandidate[] = [];

	for (const candidate of library) {
		seen.add(candidate.id);
		result.push(candidate);
	}

	for (const candidate of catalog) {
		if (!seen.has(candidate.id)) {
			seen.add(candidate.id);
			result.push(candidate);
		}
	}

	return result;
}

/**
 * Fetches per-profile daily calorie targets.
 */
export async function fetchProfileTargets(
	profileIds: string[],
): Promise<ProfileCalorieTarget[]> {
	if (profileIds.length === 0) return [];

	const { data, error } = await supabase
		.from("profile")
		.select("id, daily_calorie_goal")
		.in("id", profileIds);

	if (error || !data) return [];

	return data
		.filter((p) => p.daily_calorie_goal != null)
		.map((p) => ({
			profile_id: p.id,
			daily_calorie_goal: p.daily_calorie_goal as number,
		}));
}
