/**
 * Meal Plan Generator
 *
 * Layer 3 of the meal plan generation pipeline. Consumes the flat
 * `CompilerOutput` from the Preference Compiler and fills unlocked/targeted
 * slots with deterministically selected recipes.
 *
 * Design principles:
 *   - Stateless: given the same `GeneratorInput`, always produces the same output.
 *   - Never touches the raw preference patch stack — only reads `CompilerOutput`.
 *   - Collects all errors; never throws on the first over-constrained slot.
 *   - Hard filters are pure functions of a recipe's own attributes (no draft awareness).
 *   - Scoring signals are normalized once over the full candidate pool before the
 *     slot loop begins, ensuring scores are comparable across slots.
 */

import { addDays as dateFnsAddDays } from "date-fns";

import type {
	CompiledSlotPreferences,
	CompilerOutput,
	DraftFoodEntry,
	DraftProfileFoodEntry,
	DraftSlot,
	HardFilter,
	MealPlanDraft,
	MealType,
	SlotError,
	SlotKey,
	WeightSignal,
} from "./types";

// ==========================================
// Generator candidate model
// ==========================================

/**
 * A recipe enriched with the attributes the generator needs for filtering
 * and scoring. Fetched once per generation run from the DB and held in memory.
 */
export interface GeneratorCandidate {
	id: string;
	name: string;
	source: "library" | "catalog";

	// Nutrition (per serving)
	calories_per_serving: number;
	macros_per_serving: {
		protein_g: number;
		carbs_g: number;
		fat_g: number;
	};

	// Yield (total servings the recipe makes)
	yield: number;

	// Prep time in total minutes (hours * 60 + minutes)
	prep_time_minutes: number;

	// Non-pantry-staple ingredients used for the ingredient_overlap signal
	core_ingredients: string[];

	// Spoonacular ingredient IDs for core_ingredients — enables precise exclude_ingredient matching
	spoonacular_ingredient_ids: number[];

	// Cuisine names (lowercase) for include_cuisine filter
	cuisine_names: string[];

	// Diet names (lowercase) for dietary_restriction filter
	diet_names: string[];

	// Dish type names (lowercase) for meal-type slot filtering, e.g. 'breakfast', 'main dish'
	dish_type_names: string[];

	// Leftover state — injected during the generator loop when leftover servings remain
	is_leftover?: boolean;
	available_servings?: number;
	expires_after?: string; // ISO date string
}

// ==========================================
// Generator I/O types
// ==========================================

export interface ProfileCalorieTarget {
	profile_id: string;
	daily_calorie_goal: number; // total daily calories; generator splits equally across meal types
}

export interface GeneratorInput {
	/** The current draft, used to read slot layout, locked state, and placed recipes. */
	draft: Omit<MealPlanDraft, "undo_stack">;

	/**
	 * Compiled preferences from the Preference Compiler.
	 * Must cover every slot in `draft.slots`.
	 */
	compiled_prefs: CompilerOutput;

	/**
	 * Pre-fetched candidate pool. The API layer is responsible for fetching
	 * library + catalog recipes and passing them here. The generator is pure
	 * with respect to I/O — it never calls the DB directly.
	 */
	candidates: GeneratorCandidate[];

	/**
	 * Per-profile calorie targets used to compute needed_servings.
	 * If a profile's goal is missing the generator falls back to 500 kcal/slot.
	 */
	profile_targets: ProfileCalorieTarget[];

	/**
	 * The specific slots to fill. If omitted, all unlocked slots are filled.
	 * Corresponds to the `target` field of a `regenerate_slots` operation.
	 */
	target_slot_keys?: SlotKey[];
}

export interface GeneratorSlotResult {
	slot_key: SlotKey;
	entry: DraftFoodEntry | null; // null means the slot was over-constrained
	errors: SlotError[];
}

export interface GeneratorOutput {
	/** Updated slots merged back into the draft shape. */
	updated_slots: Record<SlotKey, DraftSlot>;
	/** Slots that could not be filled due to hard filter constraints. */
	errors: GeneratorSlotResult[];
}

// ==========================================
// Constants
// ==========================================

/** Fallback calorie target per slot when no profile goal is available. */
const FALLBACK_CALORIES_PER_SLOT = 500;

/** Leftover freshness window in days. */
const LEFTOVER_FRESHNESS_DAYS = 3;

/** Catalog fetch limit hint. Passed to the API layer; not enforced here. */
export const CATALOG_FETCH_LIMIT = 200;

/**
 * Maps each MealType to the dish type names that are eligible for that slot.
 * A candidate with ANY of the listed dish types passes the meal-type filter.
 * Candidates with no dish types recorded are treated as eligible for all slots.
 */
const MEAL_TYPE_DISH_TYPES: Record<MealType, string[]> = {
	Breakfast: ["breakfast"],
	Lunch: ["lunch", "dinner"],
	Dinner: ["dinner", "lunch"],
	Snack: ["snack"],
};

// ==========================================
// Hard filter evaluation
// ==========================================

/**
 * Returns true if the candidate passes ALL hard filters.
 * Each filter is a pure function of the candidate's own attributes.
 */
function passesHardFilters(
	candidate: GeneratorCandidate,
	filters: HardFilter[],
	slotDate: string,
	slotMealType: MealType,
): boolean {
	// Dish-type gate: candidates that have dish types recorded must include at
	// least one type that is eligible for this slot's meal type.
	// Candidates with no dish types are treated as eligible for all slots.
	if (candidate.dish_type_names.length > 0) {
		const eligibleDishTypes = MEAL_TYPE_DISH_TYPES[slotMealType];
		const hasEligibleDishType = candidate.dish_type_names.some((dt) =>
			eligibleDishTypes.includes(dt.toLowerCase()),
		);
		if (!hasEligibleDishType) return false;
	}

	// Leftover freshness: a pure function of candidate metadata + slot date.
	// Valid as a hard filter under the statefulness constraint (PRD §Hard Filter Constraint).
	if (candidate.is_leftover && candidate.expires_after) {
		if (candidate.expires_after < slotDate) return false;
	}

	for (const filter of filters) {
		switch (filter.type) {
			case "exclude_ingredient": {
				const ingredient = (filter.value as string).toLowerCase();
				const excludedByName = candidate.core_ingredients.some((ci) =>
					ci.toLowerCase().includes(ingredient),
				);
				const excludedById =
					filter.spoonacular_ingredient_id != null &&
					candidate.spoonacular_ingredient_ids.includes(
						filter.spoonacular_ingredient_id,
					);

				if (excludedByName || excludedById) return false;
				break;
			}

			case "exclude_recipe": {
				if (candidate.id === (filter.value as string)) return false;
				break;
			}

			case "dietary_restriction": {
				const restriction = (filter.value as string).toLowerCase();
				const satisfies = candidate.diet_names.some((d) =>
					d.toLowerCase().includes(restriction),
				);
				if (!satisfies) return false;
				break;
			}

			case "max_prep_time": {
				const maxMinutes = filter.value as number;
				if (candidate.prep_time_minutes > maxMinutes) return false;
				break;
			}

			case "max_ingredient_count": {
				const maxCount = filter.value as number;
				if (candidate.core_ingredients.length > maxCount) return false;
				break;
			}

			case "include_cuisine": {
				const allowedCuisines = (filter.value as string[]).map((c) =>
					c.toLowerCase(),
				);
				const hasCuisine = candidate.cuisine_names.some((cn) =>
					allowedCuisines.some((ac) => cn.toLowerCase().includes(ac)),
				);
				if (!hasCuisine) return false;
				break;
			}

			case "exclude_cuisine": {
				const excludedCuisines = (filter.value as string[]).map((c) =>
					c.toLowerCase(),
				);
				const hasBannedCuisine = candidate.cuisine_names.some((cn) =>
					excludedCuisines.some((ec) => cn.toLowerCase().includes(ec)),
				);
				if (hasBannedCuisine) return false;
				break;
			}

			case "source_restriction": {
				const allowedSource = filter.value as string;
				if (candidate.source !== allowedSource) return false;
				break;
			}
		}
	}

	return true;
}

// ==========================================
// Normalization stats (computed once per run)
// ==========================================

interface PoolStats {
	protein_ratio: { min: number; max: number };
	calorie_density: { min: number; max: number };
	prep_time: { min: number; max: number };
}

function computePoolStats(candidates: GeneratorCandidate[]): PoolStats {
	const ratios = candidates.map((c) =>
		c.calories_per_serving > 0
			? c.macros_per_serving.protein_g / c.calories_per_serving
			: 0,
	);
	const calories = candidates.map((c) => c.calories_per_serving);
	const preps = candidates.map((c) => c.prep_time_minutes);

	const minMax = (arr: number[]) => ({
		min: Math.min(...arr),
		max: Math.max(...arr),
	});

	return {
		protein_ratio: minMax(ratios),
		calorie_density: minMax(calories),
		prep_time: minMax(preps),
	};
}

/** Normalizes a value to [0, 1]. Returns 0.5 when min === max (degenerate pool). */
function normalize(value: number, min: number, max: number): number {
	if (max === min) return 0.5;
	return (value - min) / (max - min);
}

// ==========================================
// Scoring
// ==========================================

/**
 * Scores a candidate against the compiled slot preferences.
 * Higher score = more preferred.
 *
 * Each signal contributes `weight * normalizedValue` to the final score.
 * The `ingredient_overlap` signal is self-normalizing (bounded 0–1).
 */
function scoreCandidate(
	candidate: GeneratorCandidate,
	prefs: CompiledSlotPreferences,
	stats: PoolStats,
	ingredientBasket: Set<string>,
	placedRecipeIds: Set<string>,
	weights: Record<WeightSignal, number>,
): number {
	let score = 0;

	const proteinRatio =
		candidate.calories_per_serving > 0
			? candidate.macros_per_serving.protein_g / candidate.calories_per_serving
			: 0;

	// protein_ratio: higher is better → normalize ascending
	const normProtein = normalize(
		proteinRatio,
		stats.protein_ratio.min,
		stats.protein_ratio.max,
	);
	score += weights.protein_ratio * normProtein;

	// calorie_density: lower calories is better → invert normalization
	const normCalories = normalize(
		candidate.calories_per_serving,
		stats.calorie_density.min,
		stats.calorie_density.max,
	);
	score += weights.calorie_density * (1 - normCalories);

	// prep_time: lower is better → invert normalization
	const normPrep = normalize(
		candidate.prep_time_minutes,
		stats.prep_time.min,
		stats.prep_time.max,
	);
	score += weights.prep_time * (1 - normPrep);

	// source_preference: boost library recipes
	const sourceScore = candidate.source === "library" ? 1 : 0;
	score += weights.source_preference * sourceScore;

	// ingredient_overlap: self-normalizing ratio (0–1), operating on core_ingredients only
	const basketSize = ingredientBasket.size;
	const overlapCount =
		basketSize > 0
			? candidate.core_ingredients.filter((ci) => ingredientBasket.has(ci))
					.length
			: 0;
	const overlapRatio =
		candidate.core_ingredients.length > 0
			? overlapCount / candidate.core_ingredients.length
			: 0;
	score += weights.ingredient_overlap * overlapRatio;

	// leftover: additional boost for consuming already-committed servings
	if (candidate.is_leftover) {
		score += weights.leftover * 1;
	}

	return score;
}

// ==========================================
// Serving size computation
// ==========================================

/**
 * Computes the number of servings needed to approximately meet the calorie target,
 * snapped to the nearest 0.5 increment. Minimum 0.5 servings.
 */
function computeNeededServings(
	calorieTarget: number,
	caloriesPerServing: number,
): number {
	if (caloriesPerServing <= 0) return 1;
	const raw = calorieTarget / caloriesPerServing;
	return Math.max(0.5, Math.round(raw * 2) / 2);
}

/**
 * Computes the per-slot calorie target by splitting the daily goal across
 * the given number of meal types, defaulting to the fallback if unknown.
 */
function slotCalorieTarget(
	profileTargets: ProfileCalorieTarget[],
	includedProfileIds: string[],
	activeMealTypes: MealType[],
): number {
	const totalCalories = includedProfileIds.reduce((sum, pid) => {
		const target = profileTargets.find((p) => p.profile_id === pid);
		return (
			sum +
			(target?.daily_calorie_goal ??
				FALLBACK_CALORIES_PER_SLOT * activeMealTypes.length)
		);
	}, 0);

	const mealCount = activeMealTypes.length > 0 ? activeMealTypes.length : 3;
	return totalCalories / mealCount;
}

// ==========================================
// Slot sort: constraint-tightness heuristic
// ==========================================

/**
 * Sorts slot keys for processing order:
 *   1. Locked/assigned slots first — their recipes must be visible to the
 *      ingredient basket and deduplication checks before unlocked slots score.
 *   2. Remaining slots sorted by estimated constraint tightness (fewest filters = easier).
 *      Tighter slots (more filters) are processed first to avoid the generator
 *      painting itself into a corner.
 */
function sortSlotKeys(
	slotKeys: SlotKey[],
	compiledPrefs: CompilerOutput,
	draft: Omit<MealPlanDraft, "undo_stack">,
): SlotKey[] {
	return [...slotKeys].sort((a, b) => {
		const slotA = draft.slots[a];
		const slotB = draft.slots[b];

		const aHasLocked = slotA?.entries.some((e) => e.locked) ?? false;
		const bHasLocked = slotB?.entries.some((e) => e.locked) ?? false;
		const aAssigned = compiledPrefs[a]?.assigned_recipe_id != null;
		const bAssigned = compiledPrefs[b]?.assigned_recipe_id != null;

		// Locked / assigned → priority 0
		const aPriority = aHasLocked || aAssigned ? 0 : 1;
		const bPriority = bHasLocked || bAssigned ? 0 : 1;

		if (aPriority !== bPriority) return aPriority - bPriority;

		// Among unlocked slots: more filters = tighter = process first
		const aFilters = compiledPrefs[a]?.hard_filters.length ?? 0;
		const bFilters = compiledPrefs[b]?.hard_filters.length ?? 0;
		return bFilters - aFilters;
	});
}

// ==========================================
// UUID helper (platform-agnostic)
// ==========================================

function generateUUID(): string {
	// Use crypto.randomUUID() when available (Node 19+, modern browsers),
	// otherwise fall back to a simple RFC-4122 v4 implementation.
	if (
		typeof globalThis !== "undefined" &&
		globalThis.crypto &&
		typeof globalThis.crypto.randomUUID === "function"
	) {
		return globalThis.crypto.randomUUID();
	}
	// Fallback: manual RFC-4122 v4
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// ==========================================
// Main generator
// ==========================================

/**
 * Generates recipe selections for the targeted (or all unlocked) slots.
 *
 * This function is pure: it reads from `input` and returns an `GeneratorOutput`
 * without side effects. The API layer is responsible for persisting the result.
 */
export function generateSlots(input: GeneratorInput): GeneratorOutput {
	const {
		draft,
		compiled_prefs,
		candidates,
		profile_targets,
		target_slot_keys,
	} = input;

	// Determine which slots to fill
	const allSlotKeys = Object.keys(draft.slots) as SlotKey[];
	const slotsToProcess: SlotKey[] = target_slot_keys
		? target_slot_keys.filter((k) => k in draft.slots)
		: allSlotKeys.filter((key) => {
				const slot = draft.slots[key];
				// Fill slots with no entries or with any unlocked entries
				return slot.entries.length === 0 || slot.entries.some((e) => !e.locked);
			});

	// Determine active meal types in this draft for calorie splitting
	const activeMealTypes = [
		...new Set(allSlotKeys.map((k) => draft.slots[k].meal_type)),
	];

	const calorieTarget = slotCalorieTarget(
		profile_targets,
		draft.included_profile_ids,
		activeMealTypes,
	);

	// Build normalization stats from the initial candidate pool (once, before the loop)
	const poolStats = computePoolStats(candidates);

	// Mutable working copy of candidates — leftover candidates are appended mid-loop
	const workingCandidates: GeneratorCandidate[] = [...candidates];

	// Accumulated core ingredients from already-placed recipes
	const ingredientBasket = new Set<string>();

	// IDs of recipes placed so far (for novelty signal and deduplication preference)
	const placedRecipeIds = new Set<string>();

	// Result accumulator
	const updatedSlots: Record<SlotKey, DraftSlot> = { ...draft.slots };
	const errors: GeneratorSlotResult[] = [];

	// Sort slots: locked/assigned first, then by constraint tightness
	const orderedSlots = sortSlotKeys(slotsToProcess, compiled_prefs, draft);

	// Pre-seed the basket and placed IDs from already-locked slots
	// (slots NOT being regenerated, but their content should influence scoring)
	for (const key of allSlotKeys) {
		if (!slotsToProcess.includes(key)) {
			const slot = draft.slots[key];
			for (const entry of slot.entries) {
				if (entry.locked) {
					placedRecipeIds.add(entry.recipe.id);
					for (const ci of entry.recipe.core_ingredients) {
						ingredientBasket.add(ci);
					}
				}
			}
		}
	}

	// Main slot-fill loop
	for (const slotKey of orderedSlots) {
		const slot = draft.slots[slotKey];
		const prefs = compiled_prefs[slotKey];

		if (!prefs) continue;

		// Preserve any locked entries in this slot — only replace unlocked ones
		const lockedEntries = slot.entries.filter((e) => e.locked);

		// If there's an explicit assignment, resolve it directly
		if (prefs.assigned_recipe_id) {
			const assignedCandidate = workingCandidates.find(
				(c) => c.id === prefs.assigned_recipe_id,
			);

			if (assignedCandidate) {
				// Merge explicit per-profile servings with the existing entry's servings so
				// that partial updates (e.g. "update Milena's servings") preserve unchanged
				// profiles (e.g. David's servings stay the same).
				const existingEntry = slot.entries[0] ?? null;
				const rawExplicit = prefs.explicit_profile_servings;
				const resolvedServings =
					rawExplicit && rawExplicit.length > 0
						? mergeProfileServings(
								existingEntry?.profile_food_entries ?? [],
								rawExplicit,
							)
						: undefined;

				// When explicit servings exist use their sum for leftover tracking;
				// otherwise compute from calorie target.
				const neededServings =
					resolvedServings && resolvedServings.length > 0
						? resolvedServings.reduce(
								(sum, pfe) => sum + pfe.number_of_servings,
								0,
							)
						: computeNeededServings(
								calorieTarget,
								assignedCandidate.calories_per_serving,
							);

				const newEntry = buildDraftEntry(
					assignedCandidate,
					neededServings,
					draft.included_profile_ids,
					profile_targets,
					activeMealTypes,
					true, // assigned entries are locked
					resolvedServings,
				);

				// Assign always replaces everything in the slot — do NOT append to
				// lockedEntries, because a re-assign of the same slot must overwrite
				// the previously-locked entry rather than stack a duplicate.
				updatedSlots[slotKey] = {
					...slot,
					entries: [newEntry],
					errors: undefined,
				};

				placedRecipeIds.add(assignedCandidate.id);
				for (const ci of assignedCandidate.core_ingredients) {
					ingredientBasket.add(ci);
				}

				maybeEnqueueLeftover(
					assignedCandidate,
					neededServings,
					slot.date,
					workingCandidates,
				);
			}
			// If assigned recipe not found in candidates, fall through to normal selection
			// (this can happen if the recipe was deleted; treat it as unresolvable)
			continue;
		}

		// All locked entries already handled above — skip slots that are fully locked
		const hasUnlockedEntries =
			slot.entries.length === 0 || slot.entries.some((e) => !e.locked);
		if (!hasUnlockedEntries) continue;

		// Apply hard filters to the working candidate pool
		const eligible = workingCandidates.filter((c) =>
			passesHardFilters(c, prefs.hard_filters, slot.date, slot.meal_type),
		);

		if (eligible.length === 0) {
			updatedSlots[slotKey] = {
				...slot,
				entries: lockedEntries,
				errors: [
					{
						reason: "over_constrained",
						filters: prefs.hard_filters,
					} satisfies SlotError,
				],
			};
			errors.push({
				slot_key: slotKey,
				entry: null,
				errors: [{ reason: "over_constrained", filters: prefs.hard_filters }],
			});
			continue;
		}

		// Score all eligible candidates
		const scored = eligible
			.map((c) => ({
				candidate: c,
				score: scoreCandidate(
					c,
					prefs,
					poolStats,
					ingredientBasket,
					placedRecipeIds,
					prefs.weights,
				),
			}))
			.sort((a, b) => b.score - a.score);

		// Select the highest-scoring recipe not already placed in the draft,
		// unless it's a leftover (reuse is intentional)
		const selected =
			scored.find(
				({ candidate }) =>
					candidate.is_leftover || !placedRecipeIds.has(candidate.id),
			)?.candidate ?? scored[0].candidate;

		const neededServings = computeNeededServings(
			calorieTarget,
			selected.calories_per_serving,
		);

		const newEntry = buildDraftEntry(
			selected,
			neededServings,
			draft.included_profile_ids,
			profile_targets,
			activeMealTypes,
			false,
		);

		updatedSlots[slotKey] = {
			...slot,
			entries: [...lockedEntries, newEntry],
			errors: undefined,
		};

		placedRecipeIds.add(selected.id);
		for (const ci of selected.core_ingredients) {
			ingredientBasket.add(ci);
		}

		maybeEnqueueLeftover(
			selected,
			neededServings,
			slot.date,
			workingCandidates,
		);
	}

	return { updated_slots: updatedSlots, errors };
}

// ==========================================
// Helpers
// ==========================================

/**
 * Merges a base set of profile_food_entries with explicit overrides.
 *
 * - Profiles present in `overrides` get their number_of_servings updated.
 * - Profiles only in `base` (not mentioned by the user) are preserved unchanged.
 * - Profiles only in `overrides` (new profiles being added) are appended.
 *
 * This ensures partial updates like "set Milena to 2 servings" leave David's
 * servings untouched.
 */
function mergeProfileServings(
	base: DraftProfileFoodEntry[],
	overrides: DraftProfileFoodEntry[],
): DraftProfileFoodEntry[] {
	const overrideMap = new Map(
		overrides.map((o) => [o.profile_id, o.number_of_servings]),
	);
	// Apply overrides to existing profiles
	const merged = base.map((e) => ({
		...e,
		number_of_servings: overrideMap.get(e.profile_id) ?? e.number_of_servings,
	}));
	// Append override-only profiles (not currently in the slot)
	const baseIds = new Set(base.map((e) => e.profile_id));
	for (const o of overrides) {
		if (!baseIds.has(o.profile_id)) {
			merged.push(o);
		}
	}
	return merged;
}

/** Builds a DraftFoodEntry from a selected candidate and serving computation. */
function buildDraftEntry(
	candidate: GeneratorCandidate,
	neededServings: number,
	includedProfileIds: string[],
	profileTargets: ProfileCalorieTarget[],
	activeMealTypes: MealType[],
	locked: boolean,
	/**
	 * Explicit per-profile serving counts from a plan_edit(assign) op.
	 * When supplied, these are used verbatim; calorie-target computation is skipped.
	 */
	explicitProfileServings?: DraftProfileFoodEntry[],
): DraftFoodEntry {
	// If explicit servings were provided by the user, use them directly.
	if (explicitProfileServings && explicitProfileServings.length > 0) {
		return {
			draft_entry_id: generateUUID(),
			locked,
			recipe: {
				id: candidate.id,
				name: candidate.name,
				calories_per_serving: candidate.calories_per_serving,
				macros_per_serving: { ...candidate.macros_per_serving },
				yield: candidate.yield,
				core_ingredients: [...candidate.core_ingredients],
				is_leftover: candidate.is_leftover,
				available_servings: candidate.available_servings,
				expires_after: candidate.expires_after,
			},
			profile_food_entries: explicitProfileServings,
		};
	}

	// Distribute servings proportionally based on each profile's per-slot calorie goal.
	// A profile with a larger goal receives proportionally more servings.
	const mealCount = activeMealTypes.length > 0 ? activeMealTypes.length : 3;

	const perSlotGoals = includedProfileIds.map((pid) => {
		const target = profileTargets.find((p) => p.profile_id === pid);
		const dailyGoal =
			target?.daily_calorie_goal ?? FALLBACK_CALORIES_PER_SLOT * mealCount;
		return { profile_id: pid, per_slot_goal: dailyGoal / mealCount };
	});

	const totalGoal = perSlotGoals.reduce((sum, p) => sum + p.per_slot_goal, 0);

	return {
		draft_entry_id: generateUUID(),
		locked,
		recipe: {
			id: candidate.id,
			name: candidate.name,
			calories_per_serving: candidate.calories_per_serving,
			macros_per_serving: { ...candidate.macros_per_serving },
			yield: candidate.yield,
			core_ingredients: [...candidate.core_ingredients],
			is_leftover: candidate.is_leftover,
			available_servings: candidate.available_servings,
			expires_after: candidate.expires_after,
		},
		profile_food_entries: perSlotGoals.map(({ profile_id, per_slot_goal }) => {
			const proportion =
				totalGoal > 0
					? per_slot_goal / totalGoal
					: 1 / includedProfileIds.length;
			const raw = neededServings * proportion;
			// Snap to nearest 0.5, minimum 0.5 servings
			const servings = Math.max(0.5, Math.round(raw * 2) / 2);
			return { profile_id, number_of_servings: servings };
		}),
	};
}

/**
 * If a recipe yields more servings than needed, injects a leftover candidate
 * into the working pool for the next 3 days.
 */
function maybeEnqueueLeftover(
	candidate: GeneratorCandidate,
	neededServings: number,
	slotDate: string,
	workingCandidates: GeneratorCandidate[],
): void {
	// Skip if it's already a leftover — don't stack leftover state
	if (candidate.is_leftover) return;

	const leftoverServings = candidate.yield - neededServings;
	if (leftoverServings <= 0) return;

	const expiresAfter = addDays(slotDate, LEFTOVER_FRESHNESS_DAYS);

	workingCandidates.push({
		...candidate,
		is_leftover: true,
		available_servings: leftoverServings,
		expires_after: expiresAfter,
	});
}

/** Adds `days` to an ISO date string (YYYY-MM-DD) and returns the result as YYYY-MM-DD. */
function addDays(isoDate: string, days: number): string {
	return dateFnsAddDays(new Date(`${isoDate}T00:00:00Z`), days)
		.toISOString()
		.slice(0, 10);
}
