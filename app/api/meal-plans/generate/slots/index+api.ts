/**
 * POST /api/meal-plans/generate/slots
 *
 * Generator — Layer 3		),
	),
	// errors is output-only — not accepted in the request body
});l plan generation pipeline.
 *
 * Responsibilities:
 *   1. Validate the incoming request (draft + compiled prefs + optional target slots).
 *   2. Fetch library and catalog recipe candidates from Supabase (with macros,
 *      cuisine names, diet names, and ingredient names).
 *   3. Fetch per-profile calorie targets for the included profiles.
 *   4. Run the Preference Compiler over the draft to get the latest flat prefs.
 *   5. Pass everything to the pure `generateSlots` function.
 *   6. Return the updated draft slots (and any errors) to the client.
 *
 * The generator itself is stateless and lives in `lib/meal-plan-draft/generator.ts`.
 * This endpoint is the only layer that performs I/O.
 */

import { z } from "zod";
import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";
import {
	CATALOG_FETCH_LIMIT,
	generateSlots,
	type GeneratorCandidate,
	type ProfileCalorieTarget,
} from "@/lib/meal-plan-draft/generator";
import { compilePreferences } from "@/lib/meal-plan-draft/preference-compiler";
import type { MealPlanDraft, SlotKey } from "@/lib/meal-plan-draft/types";

// ==========================================
// Request schema
// ==========================================

const SlotTargetSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
	meal_type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
});

const DraftSlotSchema = z.object({
	date: z.string(),
	meal_type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
	entries: z.array(
		z.object({
			draft_entry_id: z.string(),
			locked: z.boolean(),
			recipe: z.object({
				id: z.string(),
				name: z.string(),
				calories_per_serving: z.number(),
				macros_per_serving: z.object({
					protein_g: z.number(),
					carbs_g: z.number(),
					fat_g: z.number(),
				}),
				yield: z.number(),
				core_ingredients: z.array(z.string()),
				is_leftover: z.boolean().optional(),
				available_servings: z.number().optional(),
				expires_after: z.string().optional(),
			}),
			profile_food_entries: z.array(
				z.object({
					profile_id: z.string(),
					number_of_servings: z.number(),
				}),
			),
		}),
	),
	errors: z
		.array(
			z.object({
				reason: z.literal("over_constrained"),
				filters: z.array(z.record(z.string(), z.unknown())),
			}),
		)
		.optional(),
});

const GenerateSlotsRequestSchema = z.object({
	draft: z.object({
		session_id: z.string(),
		included_profile_ids: z.array(z.string()).min(1),
		slots: z.record(DraftSlotSchema),
		preference_patch_stack: z.array(z.record(z.string(), z.unknown())),
	}),
	/**
	 * Specific slots to regenerate. Omit to regenerate all unlocked slots.
	 * Corresponds to the `target` field of a `regenerate_slots` operation.
	 */
	target_slots: z.array(SlotTargetSchema).optional(),
	/**
	 * Per-slot recipe assignments from `plan_edit(assign)` interpreter ops.
	 * Forwarded to the Preference Compiler, which writes `assigned_recipe_id`
	 * into the compiled output so the generator places the exact recipe.
	 */
	slot_assignments: z
		.array(
			z.object({
				date: z.string(),
				meal_type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
				recipe_id: z.string(),
				profile_servings: z
					.array(
						z.object({
							profile_id: z.string(),
							servings: z.number(),
						}),
					)
					.optional(),
			}),
		)
		.optional(),
});

export type PostGenerateSlotsRequest = z.infer<
	typeof GenerateSlotsRequestSchema
>;
export type PostGenerateSlotsResponse = Awaited<ReturnType<typeof POST>>;

// ==========================================
// DB row type for the recipe candidate query
// ==========================================

interface RecipeMacrosRow {
	calories: number | null;
	protein: number | null;
	carbohydrate: number | null;
	fat: number | null;
}

interface RecipeCandidateRow {
	id: string;
	name: string;
	source: string;
	number_of_servings: number;
	prep_time_hours: number | null;
	prep_time_minutes: number | null;
	// Supabase returns joined rows as an array even for to-one joins
	macros: RecipeMacrosRow[];
	recipe_cuisines: { cuisines: { name: string } | null }[];
	recipe_diets: { diets: { name: string } | null }[];
	recipe_dish_types: { dish_types: { name: string } | null }[];
	// Supabase uses the table name "ingredient" (singular) for the join key
	ingredient: {
		name: string | null;
		type: string;
		food: { spoonacular_id: number | null; food_name: string } | null;
	}[];
}

// ==========================================
// Candidate mapping
// ==========================================

/**
 * Maps a DB recipe row to the `GeneratorCandidate` shape.
 *
 * `core_ingredients` is derived from ingredients whose `type` is not
 * "pantry_staple". That classification is stored on the ingredient row's
 * `type` field at recipe-enrichment time.
 */
function mapRowToCandidate(row: RecipeCandidateRow): GeneratorCandidate {
	const macros = row.macros[0] ?? null;

	// recipe_macros stores values per serving already — no division needed.
	const caloriesPerServing = macros?.calories ?? 0;
	const proteinPerServing = macros?.protein ?? 0;
	const carbsPerServing = macros?.carbohydrate ?? 0;
	const fatPerServing = macros?.fat ?? 0;

	const prepMinutes =
		(row.prep_time_hours ?? 0) * 60 + (row.prep_time_minutes ?? 0);

	type IngredientRow = {
		name: string | null;
		type: string;
		food: { spoonacular_id: number | null; food_name: string } | null;
	};

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
		yield: row.number_of_servings,
		prep_time_minutes: prepMinutes,
		core_ingredients: coreIngredients,
		spoonacular_ingredient_ids: spoonacularIngredientIds,
		cuisine_names: cuisineNames,
		diet_names: dietNames,
		dish_type_names: dishTypeNames,
	};
}

// ==========================================
// Recipe fetch helpers
// ==========================================

/**
 * Fetches all library recipes belonging to the authenticated user.
 */
async function fetchLibraryRecipes(
	userId: string,
): Promise<GeneratorCandidate[]> {
	const { data, error } = await supabase
		.from("recipe")
		.select(
			`
			id,
			name,
			source,
			number_of_servings,
			prep_time_hours,
			prep_time_minutes,
			macros:recipe_macros (calories, protein, carbohydrate, fat),
			recipe_cuisines (cuisines (name)),
			recipe_diets (diets (name)),
			recipe_dish_types (dish_types (name)),
			ingredient (name, type, food(spoonacular_id, food_name))
		`,
		)
		.eq("user_id", userId);

	if (error || !data) return [];

	return (data as unknown as RecipeCandidateRow[]).map(mapRowToCandidate);
}

/**
 * Fetches a bounded set of catalog recipes.
 * Catalog recipes are shared across all users (user_id IS NULL or source = 'catalog').
 */
async function fetchCatalogRecipes(): Promise<GeneratorCandidate[]> {
	const { data, error } = await supabase
		.from("recipe")
		.select(
			`
			id,
			name,
			source,
			number_of_servings,
			prep_time_hours,
			prep_time_minutes,
			macros:recipe_macros (calories, protein, carbohydrate, fat),
			recipe_cuisines (cuisines (name)),
			recipe_diets (diets (name)),
			recipe_dish_types (dish_types (name)),
			ingredient (name, type, food(spoonacular_id, food_name))
		`,
		)
		.eq("source", "catalog")
		.limit(CATALOG_FETCH_LIMIT);

	if (error || !data) return [];

	return (data as unknown as RecipeCandidateRow[]).map(mapRowToCandidate);
}

/**
 * Deduplicates library + catalog candidates.
 * Library version always wins when both have the same ID
 * (e.g., the user imported a catalog recipe into their library).
 */
function deduplicateCandidates(
	library: GeneratorCandidate[],
	catalog: GeneratorCandidate[],
): GeneratorCandidate[] {
	const seen = new Set<string>();
	const result: GeneratorCandidate[] = [];

	// Library first — takes precedence
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

// ==========================================
// Profile target fetch
// ==========================================

async function fetchProfileTargets(
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

// ==========================================
// Handler
// ==========================================

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	// Parse & validate request
	let body: PostGenerateSlotsRequest;
	try {
		const raw = await req.json();
		const result = GenerateSlotsRequestSchema.safeParse(raw);
		if (!result.success) {
			return jsonResponse(
				{ error: "Invalid request body", details: result.error.errors },
				{ status: 400 },
			);
		}
		body = result.data;
	} catch {
		return jsonResponse({ error: "Malformed JSON" }, { status: 400 });
	}

	const { draft, target_slots, slot_assignments } = body;

	// Resolve target slot keys from the target_slots array (if provided)
	const targetSlotKeys: SlotKey[] | undefined = target_slots?.map(
		(t) => `${t.date}.${t.meal_type}` as SlotKey,
	);

	// Fetch candidates and profile targets in parallel
	const [libraryRecipes, catalogRecipes, profileTargets] = await Promise.all([
		fetchLibraryRecipes(session.user.id),
		fetchCatalogRecipes(),
		fetchProfileTargets(draft.included_profile_ids),
	]);

	const candidates = deduplicateCandidates(libraryRecipes, catalogRecipes);

	// Run the Preference Compiler to get the latest flat preferences
	// The cast is safe: the request schema validates the structure and
	// preference_patch_stack arrives as a JSON object array from the client.
	const draftForCompiler = draft as unknown as Pick<
		MealPlanDraft,
		"slots" | "preference_patch_stack"
	>;
	const compiledPrefs = compilePreferences(
		draftForCompiler,
		undefined,
		slot_assignments,
	);

	// Run the generator
	const output = generateSlots({
		draft: draft as unknown as Omit<MealPlanDraft, "undo_stack">,
		compiled_prefs: compiledPrefs,
		candidates,
		profile_targets: profileTargets,
		target_slot_keys: targetSlotKeys,
	});

	return jsonResponse({
		updated_slots: output.updated_slots,
		errors: output.errors,
	});
}
