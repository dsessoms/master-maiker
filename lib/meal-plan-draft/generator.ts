/**
 * Meal Plan Generator
 *
 * Layer 3 of the meal plan generation pipeline. Consumes the flat
 * `CompilerOutput` from the Preference Compiler and fills unlocked/targeted
 * slots with deterministically selected recipes.
 *
 * Pipeline (four phases):
 *   1. Global pre-filter   — reduces the candidate pool once using filters
 *      that apply to every slot (scope:null patches).
 *   2. Eligible counts + pool stats  — per-slot eligible candidate lists
 *      (accurate tightness for processing order) and normalization stats.
 *   3. Serving-first selection  — most-constrained-first slot loop. Prefers
 *      consuming existing servings (leftovers), applies variety caps, enforces
 *      same-day uniqueness, promotes retroactive cook days, and uses seeded
 *      top-K weighted-random sampling for plan variety.
 *   4. Placement pass  — converts slot assignments to `DraftFoodEntry` values
 *      with per-profile serving distributions.
 */

import type {
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

import { addDays as dateFnsAddDays } from "date-fns";

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

	servings: number;
	image_id?: string | null;

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

	// Leftover state — set when a recipe has surplus servings from an earlier slot
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

export type VarietyLevel = "high" | "medium" | "low";

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

	/**
	 * Seed for the pseudo-random number generator. Providing the same seed
	 * produces identical output, enabling reproducible tests. When omitted,
	 * `Date.now()` is used (fresh randomness each run).
	 */
	seed?: number;

	/**
	 * Size of the candidate shortlist used for weighted-random selection.
	 * The generator scores all eligible candidates, takes the top `top_k` by
	 * score, then picks one proportional to score. Defaults to 5.
	 *
	 * top_k = 1 → fully deterministic (always picks the highest-scoring candidate).
	 */
	top_k?: number;

	/**
	 * Controls the maximum number of distinct recipes per meal type per week.
	 *
	 *   high   — unrestricted (maximum novelty).
	 *   medium — moderate repetition (default): 2 Breakfasts, 3 Lunches, 5 Dinners, 2 Snacks.
	 *   low    — batch-cooking mode: 1 Breakfast, 2 Lunches, 3 Dinners, 1 Snack.
	 */
	variety?: VarietyLevel;
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
// Internal selection types
// ==========================================

interface ChosenEntry {
	candidate: GeneratorCandidate;
	remaining_servings: number;
	cook_date: string; // ISO date of the slot where this recipe was (or will be) cooked
}

interface SlotAssignment {
	candidate: GeneratorCandidate;
	estimated_servings: number;
	is_leftover_slot: boolean;
	locked: boolean;
	explicit_profile_servings?: DraftProfileFoodEntry[];
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
 *
 * Cross-meal-type eligibility (Lunch <-> Dinner) enables leftover reuse across
 * different meal types — e.g. Wednesday Dinner can become Thursday Lunch.
 */
const MEAL_TYPE_DISH_TYPES: Record<MealType, string[]> = {
	Breakfast: ["breakfast"],
	Lunch: ["lunch", "dinner"],
	Dinner: ["dinner", "lunch"],
	Snack: ["snack"],
};

/**
 * Maximum number of distinct recipes per meal type at each variety level.
 * At "high" there is no cap. At "low" the generator consolidates around a
 * handful of batch-cooked recipes and fills remaining slots with leftovers.
 */
const VARIETY_CAPS: Record<VarietyLevel, Record<MealType, number>> = {
	high: {
		Breakfast: Infinity,
		Lunch: Infinity,
		Dinner: Infinity,
		Snack: Infinity,
	},
	medium: { Breakfast: 2, Lunch: 3, Dinner: 5, Snack: 2 },
	low: { Breakfast: 1, Lunch: 2, Dinner: 3, Snack: 1 },
};

// ==========================================
// PRNG
// ==========================================

/**
 * Mulberry32 seeded pseudo-random number generator.
 * Returns a function that produces uniformly distributed floats in [0, 1).
 * Identical seed -> identical sequence, enabling reproducible generation.
 */
function seededRandom(seed: number): () => number {
	let s = seed >>> 0;
	return function () {
		s += 0x6d2b79f5;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Picks one item from the top-K scored candidates using weighted-random
 * selection proportional to score. Scores are shifted to be strictly positive
 * before weighting, so negative base scores never exclude candidates unfairly.
 *
 * When `k === 1` (or only one candidate exists) the highest-scoring item is
 * always returned — fully deterministic.
 */
function weightedTopKPick<T>(
	scored: { item: T; score: number }[],
	k: number,
	rng: () => number,
): T {
	const topK = scored.slice(0, Math.min(k, scored.length));
	if (topK.length === 1) return topK[0].item;

	// Shift so all weights are strictly positive (handles negative scores)
	const minScore = Math.min(...topK.map((x) => x.score));
	const shifted = topK.map((x) => ({
		item: x.item,
		weight: x.score - minScore + 1e-9,
	}));
	const total = shifted.reduce((s, x) => s + x.weight, 0);

	let r = rng() * total;
	for (const { item, weight } of shifted) {
		r -= weight;
		if (r <= 0) return item;
	}
	return shifted[shifted.length - 1].item;
}

// ==========================================
// Hard filter evaluation
// ==========================================

/**
 * Returns true if the candidate passes the meal-type dish-type gate and the
 * leftover freshness window for the given slot.
 *
 * Separated from `passesFilterList` so the global pre-filter phase can skip
 * the meal-type gate, which is slot-specific by definition.
 */
function passesSlotGates(
	candidate: GeneratorCandidate,
	slotDate: string,
	slotMealType: MealType,
): boolean {
	if (candidate.dish_type_names.length > 0) {
		const eligible = MEAL_TYPE_DISH_TYPES[slotMealType];
		const passes = candidate.dish_type_names.some((dt) =>
			eligible.includes(dt.toLowerCase()),
		);
		if (!passes) return false;
	}

	if (candidate.is_leftover && candidate.expires_after) {
		if (candidate.expires_after < slotDate) return false;
	}

	return true;
}

/**
 * Returns true if the candidate passes all attribute-level hard filters.
 * Does NOT apply the dish-type gate or freshness check — call `passesHardFilters`
 * to apply both together.
 */
function passesFilterList(
	candidate: GeneratorCandidate,
	filters: HardFilter[],
): boolean {
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

/** Convenience wrapper: passesSlotGates AND passesFilterList. */
function passesHardFilters(
	candidate: GeneratorCandidate,
	filters: HardFilter[],
	slotDate: string,
	slotMealType: MealType,
): boolean {
	return (
		passesSlotGates(candidate, slotDate, slotMealType) &&
		passesFilterList(candidate, filters)
	);
}

// ==========================================
// Phase 1: Global filter extraction
// ==========================================

/**
 * Returns the intersection of all slots' hard_filters — filters that appear
 * identically in every compiled slot (i.e. filters from scope:null patches).
 * Applied once to the full candidate pool before per-slot filtering begins.
 */
function extractGlobalFilters(compiled_prefs: CompilerOutput): HardFilter[] {
	const entries = Object.values(compiled_prefs);
	if (entries.length === 0) return [];

	return entries[0].hard_filters.filter((f) =>
		entries.every((prefs) =>
			prefs.hard_filters.some(
				(other) =>
					other.type === f.type &&
					JSON.stringify(other.value) === JSON.stringify(f.value) &&
					other.spoonacular_ingredient_id === f.spoonacular_ingredient_id,
			),
		),
	);
}

// ==========================================
// Phase 2: Per-slot eligible candidate lists
// ==========================================

/**
 * For each slot key, returns the subset of `globalFilteredPool` that passes
 * the slot's full hard filters (including dish-type gate).
 *
 * Computed over ALL slot keys — not just slotsToProcess — so the retroactive
 * cook-day search can check eligibility for any earlier slot in the plan.
 */
function computeEligibleCandidates(
	slotKeys: SlotKey[],
	draft: Omit<MealPlanDraft, "undo_stack">,
	globalFilteredPool: GeneratorCandidate[],
	compiled_prefs: CompilerOutput,
): Record<SlotKey, GeneratorCandidate[]> {
	const result = {} as Record<SlotKey, GeneratorCandidate[]>;
	for (const key of slotKeys) {
		const slot = draft.slots[key];
		const prefs = compiled_prefs[key];
		if (!slot || !prefs) {
			result[key] = [];
			continue;
		}
		result[key] = globalFilteredPool.filter((c) =>
			passesHardFilters(c, prefs.hard_filters, slot.date, slot.meal_type),
		);
	}
	return result;
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
	if (candidates.length === 0) {
		const zero = { min: 0, max: 0 };
		return { protein_ratio: zero, calorie_density: zero, prep_time: zero };
	}

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
 * Scores a candidate against weight signals and the current plan state.
 * Higher score = more preferred.
 *
 * Signals:
 *   protein_ratio    — higher protein % of calories is better (ascending)
 *   calorie_density  — lower calories per serving is better (descending)
 *   prep_time        — lower prep time is better (descending)
 *   source_preference — library recipes preferred over catalog
 *   ingredient_overlap — shares ingredients with already-placed recipes
 *   leftover         — extra boost for consuming committed surplus servings
 */
function scoreCandidate(
	candidate: GeneratorCandidate,
	stats: PoolStats,
	ingredientBasket: Set<string>,
	weights: Record<WeightSignal, number>,
): number {
	let score = 0;

	const proteinRatio =
		candidate.calories_per_serving > 0
			? candidate.macros_per_serving.protein_g / candidate.calories_per_serving
			: 0;
	score +=
		weights.protein_ratio *
		normalize(proteinRatio, stats.protein_ratio.min, stats.protein_ratio.max);

	score +=
		weights.calorie_density *
		(1 -
			normalize(
				candidate.calories_per_serving,
				stats.calorie_density.min,
				stats.calorie_density.max,
			));

	score +=
		weights.prep_time *
		(1 -
			normalize(
				candidate.prep_time_minutes,
				stats.prep_time.min,
				stats.prep_time.max,
			));

	score += weights.source_preference * (candidate.source === "library" ? 1 : 0);

	const overlapCount =
		ingredientBasket.size > 0
			? candidate.core_ingredients.filter((ci) => ingredientBasket.has(ci))
					.length
			: 0;
	const overlapRatio =
		candidate.core_ingredients.length > 0
			? overlapCount / candidate.core_ingredients.length
			: 0;
	score += weights.ingredient_overlap * overlapRatio;

	if (candidate.is_leftover) {
		score += weights.leftover * 1;
	}

	return score;
}

// ==========================================
// Serving size computation
// ==========================================

/**
 * Computes the number of servings needed to approximately meet the calorie
 * target, snapped to the nearest 1 increment. Minimum 1 servings.
 */
function computeNeededServings(
	calorieTarget: number,
	caloriesPerServing: number,
): number {
	if (caloriesPerServing <= 0) return 1;
	const raw = calorieTarget / caloriesPerServing;
	return Math.round(raw);
}

/**
 * Computes the per-slot calorie target by splitting each profile's daily goal
 * across all active meal types. Falls back to FALLBACK_CALORIES_PER_SLOT when
 * a profile target is unavailable.
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
// Retroactive cook-day promotion
// ==========================================

/**
 * Given a newly selected recipe and its constrained target slot, searches for
 * the best earlier unassigned slot to act as the cook day, so the constrained
 * slot can eat leftovers instead.
 *
 * Eligibility criteria for a cook-day candidate:
 *   - Chronologically before targetSlot.date
 *   - Not already committed or assigned
 *   - The recipe is eligible for that slot (passes eligibleCandidates check)
 *   - Freshness window is satisfiable: targetDate <= cookDate + LEFTOVER_FRESHNESS_DAYS
 *   - No same-day uniqueness conflict on either the cook day or the target day
 *
 * Tie-breaking: prefer the earliest valid cook date (maximizes freshness window
 * coverage and keeps leftover chains predictable).
 *
 * Returns the slot key of the chosen cook day, or null if none is found.
 */
function findCookDaySlot(
	selectedId: string,
	targetSlotKey: SlotKey,
	allSlotKeys: SlotKey[],
	draft: Omit<MealPlanDraft, "undo_stack">,
	eligibleCandidates: Record<SlotKey, GeneratorCandidate[]>,
	committedSlots: Set<SlotKey>,
	slotAssignments: Map<SlotKey, SlotAssignment>,
	dailyAssignments: Map<string, Set<string>>,
): SlotKey | null {
	const targetDate = draft.slots[targetSlotKey].date;
	const valid: { key: SlotKey; date: string }[] = [];

	for (const key of allSlotKeys) {
		if (key === targetSlotKey) continue;
		if (committedSlots.has(key)) continue;
		if (slotAssignments.has(key)) continue;

		const slot = draft.slots[key];
		if (!slot) continue;

		// Only promote empty slots as cook days — slots with any existing entries
		// (locked or unlocked) are already occupied and must not receive a new
		// stacked entry from retroactive cook-day promotion.
		if (slot.entries.length > 0) continue;

		if (slot.date >= targetDate) continue;
		if (targetDate > addDays(slot.date, LEFTOVER_FRESHNESS_DAYS)) continue;
		if (!eligibleCandidates[key]?.some((c) => c.id === selectedId)) continue;
		if (dailyAssignments.get(slot.date)?.has(selectedId)) continue;
		if (dailyAssignments.get(targetDate)?.has(selectedId)) continue;

		valid.push({ key, date: slot.date });
	}

	if (valid.length === 0) return null;

	valid.sort((a, b) => a.date.localeCompare(b.date));
	return valid[0].key;
}

// ==========================================
// Coverage potential bonus
// ==========================================

/**
 * Estimates what fraction of remaining uncovered slots a candidate could cover
 * with its leftover servings after the current slot, normalized to [0, 1].
 *
 * Rewards new recipes with high servings that can bridge multiple future slots —
 * reducing the total number of distinct recipes in the plan.
 */
function coveragePotential(
	candidate: GeneratorCandidate,
	estimatedServings: number,
	currentSlotDate: string,
	remainingSlotKeys: SlotKey[],
	draft: Omit<MealPlanDraft, "undo_stack">,
	eligibleCandidates: Record<SlotKey, GeneratorCandidate[]>,
	dailyAssignments: Map<string, Set<string>>,
): number {
	if (candidate.servings <= estimatedServings) return 0;

	const expiresAfter = addDays(currentSlotDate, LEFTOVER_FRESHNESS_DAYS);
	let coverableCount = 0;

	for (const key of remainingSlotKeys) {
		const slot = draft.slots[key];
		if (!slot) continue;
		if (slot.date <= currentSlotDate) continue;
		if (slot.date > expiresAfter) continue;
		if (!eligibleCandidates[key]?.some((c) => c.id === candidate.id)) continue;
		if (dailyAssignments.get(slot.date)?.has(candidate.id)) continue;
		coverableCount++;
	}

	return remainingSlotKeys.length > 0
		? coverableCount / remainingSlotKeys.length
		: 0;
}

// ==========================================
// UUID helper (platform-agnostic)
// ==========================================

function generateUUID(): string {
	if (
		typeof globalThis !== "undefined" &&
		globalThis.crypto &&
		typeof globalThis.crypto.randomUUID === "function"
	) {
		return globalThis.crypto.randomUUID();
	}
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
 * Pure function: given the same `GeneratorInput` (including `seed`), always
 * produces the same output. The API layer is responsible for DB persistence.
 */
export function generateSlots(input: GeneratorInput): GeneratorOutput {
	const {
		draft,
		compiled_prefs,
		candidates,
		profile_targets,
		target_slot_keys,
		seed,
		top_k = 5,
		variety = "medium",
	} = input;

	const rng = seededRandom(seed ?? Date.now());
	const varietyCap = VARIETY_CAPS[variety];

	// ---- Slot layout ----
	const allSlotKeys = Object.keys(draft.slots) as SlotKey[];
	const slotsToProcess: SlotKey[] = target_slot_keys
		? target_slot_keys.filter((k) => k in draft.slots)
		: allSlotKeys.filter((key) => {
				const slot = draft.slots[key];
				return slot.entries.length === 0 || slot.entries.some((e) => !e.locked);
			});

	const activeMealTypes = [
		...new Set(allSlotKeys.map((k) => draft.slots[k].meal_type)),
	];

	const calorieTarget = slotCalorieTarget(
		profile_targets,
		draft.included_profile_ids,
		activeMealTypes,
	);

	// ==========================================
	// Phase 1: Global pre-filter
	// ==========================================

	// Filters that appear in every slot's compiled prefs are global (scope:null).
	// Apply them once to reduce the pool before per-slot filtering.
	const globalFilters = extractGlobalFilters(compiled_prefs);
	const globalFilteredPool = candidates.filter((c) =>
		passesFilterList(c, globalFilters),
	);

	// ==========================================
	// Phase 2: Per-slot eligible lists + pool stats
	// ==========================================

	// Compute for ALL slot keys (not just slotsToProcess) so the retroactive
	// cook-day search can check eligibility against any earlier slot in the plan.
	const eligibleCandidates = computeEligibleCandidates(
		allSlotKeys,
		draft,
		globalFilteredPool,
		compiled_prefs,
	);

	const poolStats = computePoolStats(globalFilteredPool);

	// Sort slots:
	//   1. Locked / assigned first — seed ingredient basket and daily-assignment
	//      state before unlocked slots score.
	//   2. Among unlocked: ascending eligible count (fewest = most constrained = first).
	const orderedSlots = [...slotsToProcess].sort((a, b) => {
		const slotA = draft.slots[a];
		const slotB = draft.slots[b];

		const aHasLocked = slotA?.entries.some((e) => e.locked) ?? false;
		const bHasLocked = slotB?.entries.some((e) => e.locked) ?? false;
		const aAssigned = compiled_prefs[a]?.assigned_recipe_id != null;
		const bAssigned = compiled_prefs[b]?.assigned_recipe_id != null;

		const aPriority = aHasLocked || aAssigned ? 0 : 1;
		const bPriority = bHasLocked || bAssigned ? 0 : 1;
		if (aPriority !== bPriority) return aPriority - bPriority;

		const aEligible = eligibleCandidates[a]?.length ?? 0;
		const bEligible = eligibleCandidates[b]?.length ?? 0;
		return aEligible - bEligible;
	});

	// ==========================================
	// Phase 3: Serving-first selection
	// ==========================================

	// Registry of recipes committed to the plan with remaining consumable servings.
	const chosenRegistry = new Map<string, ChosenEntry>();

	// Final per-slot assignments — populated by both the selection loop and
	// by retroactive cook-day promotion.
	const slotAssignments = new Map<SlotKey, SlotAssignment>();

	// Slots claimed via retroactive cook-day promotion — skipped when the loop
	// reaches them normally.
	const committedSlots = new Set<SlotKey>();

	// Core ingredients of placed recipes — drives ingredient_overlap scoring.
	const ingredientBasket = new Set<string>();

	// Recipe IDs per date — enforces same-day meal uniqueness.
	const dailyAssignments = new Map<string, Set<string>>();

	// Distinct recipe IDs per meal type — enforces variety caps.
	const distinctByMealType = new Map<MealType, Set<string>>();
	for (const mt of activeMealTypes) {
		distinctByMealType.set(mt, new Set<string>());
	}

	const generatorErrors: GeneratorSlotResult[] = [];

	function recordDailyAssignment(date: string, recipeId: string): void {
		if (!dailyAssignments.has(date)) dailyAssignments.set(date, new Set());
		dailyAssignments.get(date)!.add(recipeId);
	}

	// Pre-seed state from locked entries across ALL slots (including those being
	// regenerated). Slots with [locked + unlocked] entries are in slotsToProcess,
	// so without this, their locked recipe IDs are never recorded — allowing the
	// generator to pick the same recipe again as the new unlocked entry (duplicate).
	for (const key of allSlotKeys) {
		const slot = draft.slots[key];
		for (const entry of slot.entries) {
			if (!entry.locked) continue;
			recordDailyAssignment(slot.date, entry.recipe.id);
			distinctByMealType.get(slot.meal_type)?.add(entry.recipe.id);
			for (const ci of entry.recipe.core_ingredients) {
				ingredientBasket.add(ci);
			}
		}
	}

	// --- Main selection loop ---
	for (const slotKey of orderedSlots) {
		// Skip slots already committed by retroactive cook-day promotion
		if (committedSlots.has(slotKey)) continue;

		const slot = draft.slots[slotKey];
		const prefs = compiled_prefs[slotKey];
		if (!slot || !prefs) continue;

		// ---- Explicit assignment (plan_edit assign) ----
		if (prefs.assigned_recipe_id) {
			const assignedCandidate = globalFilteredPool.find(
				(c) => c.id === prefs.assigned_recipe_id,
			);

			if (assignedCandidate) {
				const existingEntry = slot.entries[0] ?? null;
				const rawExplicit = prefs.explicit_profile_servings;
				const resolvedServings =
					rawExplicit && rawExplicit.length > 0
						? mergeProfileServings(
								existingEntry?.profile_food_entries ?? [],
								rawExplicit,
							)
						: undefined;

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

				slotAssignments.set(slotKey, {
					candidate: assignedCandidate,
					estimated_servings: neededServings,
					is_leftover_slot: false,
					locked: true,
					explicit_profile_servings: resolvedServings,
				});

				const existingChosen = chosenRegistry.get(assignedCandidate.id);
				chosenRegistry.set(assignedCandidate.id, {
					candidate: assignedCandidate,
					remaining_servings: Math.max(
						0,
						(existingChosen?.remaining_servings ?? assignedCandidate.servings) -
							neededServings,
					),
					cook_date: slot.date,
				});

				recordDailyAssignment(slot.date, assignedCandidate.id);
				distinctByMealType.get(slot.meal_type)?.add(assignedCandidate.id);
				for (const ci of assignedCandidate.core_ingredients) {
					ingredientBasket.add(ci);
				}
			}
			// Whether or not the recipe was found, the assign op owns this slot.
			continue;
		}

		// ---- Skip fully locked slots (seed state from them) ----
		const hasUnlocked =
			slot.entries.length === 0 || slot.entries.some((e) => !e.locked);
		if (!hasUnlocked) {
			for (const entry of slot.entries) {
				recordDailyAssignment(slot.date, entry.recipe.id);
				distinctByMealType.get(slot.meal_type)?.add(entry.recipe.id);
				for (const ci of entry.recipe.core_ingredients) {
					ingredientBasket.add(ci);
				}
			}
			continue;
		}

		// ---- Step 1: Build dynamic eligible set ----
		const staticEligible = eligibleCandidates[slotKey] ?? [];
		const distinctForMealType =
			distinctByMealType.get(slot.meal_type) ?? new Set<string>();
		const capReached = distinctForMealType.size >= varietyCap[slot.meal_type];

		const dynamicEligible = staticEligible.filter((c) => {
			if (dailyAssignments.get(slot.date)?.has(c.id)) return false;
			if (capReached && !distinctForMealType.has(c.id)) return false;
			return true;
		});

		// ---- Step 2: Build merged candidate pool (leftovers + new) ----
		const remainingSlotKeys = orderedSlots.filter(
			(k) => k !== slotKey && !slotAssignments.has(k) && !committedSlots.has(k),
		);

		const scored: { item: GeneratorCandidate; score: number }[] = [];
		const addedIds = new Set<string>();

		// Leftover candidates: surplus servings already committed in the plan
		for (const [id, entry] of chosenRegistry) {
			if (entry.remaining_servings <= 0) continue;

			const leftoverCandidate: GeneratorCandidate = {
				...entry.candidate,
				is_leftover: true,
				available_servings: entry.remaining_servings,
				expires_after: addDays(entry.cook_date, LEFTOVER_FRESHNESS_DAYS),
			};

			if (
				!passesHardFilters(
					leftoverCandidate,
					prefs.hard_filters,
					slot.date,
					slot.meal_type,
				)
			)
				continue;
			if (dailyAssignments.get(slot.date)?.has(id)) continue;
			if (capReached && !distinctForMealType.has(id)) continue;

			scored.push({
				item: leftoverCandidate,
				score: scoreCandidate(
					leftoverCandidate,
					poolStats,
					ingredientBasket,
					prefs.weights,
				),
			});
			addedIds.add(id);
		}

		// New candidates from the dynamic eligible set
		for (const c of dynamicEligible) {
			if (addedIds.has(c.id)) continue;

			const estimatedServings = computeNeededServings(
				calorieTarget,
				c.calories_per_serving,
			);
			const potential = coveragePotential(
				c,
				estimatedServings,
				slot.date,
				remainingSlotKeys,
				draft,
				eligibleCandidates,
				dailyAssignments,
			);

			scored.push({
				item: c,
				score:
					scoreCandidate(c, poolStats, ingredientBasket, prefs.weights) +
					prefs.weights.leftover * potential,
			});
			addedIds.add(c.id);
		}

		// ---- Over-constrained ----
		if (scored.length === 0) {
			generatorErrors.push({
				slot_key: slotKey,
				entry: null,
				errors: [{ reason: "over_constrained", filters: prefs.hard_filters }],
			});
			continue;
		}

		// ---- Step 3: Top-K seeded pick ----
		scored.sort((a, b) => b.score - a.score);
		const selected = weightedTopKPick(scored, top_k, rng);
		const estimatedServings = computeNeededServings(
			calorieTarget,
			selected.calories_per_serving,
		);

		// ---- Step 4: Retroactive cook-day promotion ----
		let isLeftoverSlot = selected.is_leftover === true;
		let cookDaySlotKey: SlotKey | null = null;

		if (!selected.is_leftover && selected.servings > estimatedServings) {
			cookDaySlotKey = findCookDaySlot(
				selected.id,
				slotKey,
				allSlotKeys,
				draft,
				eligibleCandidates,
				committedSlots,
				slotAssignments,
				dailyAssignments,
			);

			if (cookDaySlotKey !== null) {
				slotAssignments.set(cookDaySlotKey, {
					candidate: selected,
					estimated_servings: estimatedServings,
					is_leftover_slot: false,
					locked: false,
				});
				committedSlots.add(cookDaySlotKey);
				recordDailyAssignment(draft.slots[cookDaySlotKey].date, selected.id);
				distinctByMealType
					.get(draft.slots[cookDaySlotKey].meal_type)
					?.add(selected.id);
				isLeftoverSlot = true;
			}
		}

		// ---- Step 5: Update state ----
		slotAssignments.set(slotKey, {
			candidate: selected,
			estimated_servings: estimatedServings,
			is_leftover_slot: isLeftoverSlot,
			locked: false,
		});

		if (selected.is_leftover) {
			const existing = chosenRegistry.get(selected.id);
			if (existing) {
				existing.remaining_servings = Math.max(
					0,
					existing.remaining_servings - estimatedServings,
				);
			}
		} else {
			const cookDate = cookDaySlotKey
				? draft.slots[cookDaySlotKey].date
				: slot.date;
			chosenRegistry.set(selected.id, {
				candidate: selected,
				remaining_servings: Math.max(0, selected.servings - estimatedServings),
				cook_date: cookDate,
			});
			for (const ci of selected.core_ingredients) {
				ingredientBasket.add(ci);
			}
		}

		recordDailyAssignment(slot.date, selected.id);
		distinctByMealType.get(slot.meal_type)?.add(selected.id);
	}

	// ==========================================
	// Phase 4: Placement
	// ==========================================

	const updatedSlots: Record<SlotKey, DraftSlot> = { ...draft.slots };

	for (const [slotKey, assignment] of slotAssignments) {
		const slot = draft.slots[slotKey];
		if (!slot) continue;

		const lockedEntries = slot.entries.filter((e) => e.locked);

		const candidateForEntry: GeneratorCandidate = assignment.is_leftover_slot
			? { ...assignment.candidate, is_leftover: true }
			: assignment.candidate;

		const entry = buildDraftEntry(
			candidateForEntry,
			assignment.estimated_servings,
			draft.included_profile_ids,
			profile_targets,
			activeMealTypes,
			assignment.locked,
			assignment.explicit_profile_servings,
		);

		if (assignment.locked) {
			// Assigned entries replace the full slot (no stacking duplicates)
			updatedSlots[slotKey] = { ...slot, entries: [entry], errors: undefined };
		} else {
			updatedSlots[slotKey] = {
				...slot,
				entries: [...lockedEntries, entry],
				errors: undefined,
			};
		}
	}

	// Mark over-constrained slots
	for (const err of generatorErrors) {
		const slot = draft.slots[err.slot_key];
		if (!slot) continue;
		const lockedEntries = slot.entries.filter((e) => e.locked);
		updatedSlots[err.slot_key] = {
			...slot,
			entries: lockedEntries,
			errors: err.errors,
		};
	}

	return { updated_slots: updatedSlots, errors: generatorErrors };
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
	const merged = base.map((e) => ({
		...e,
		number_of_servings: overrideMap.get(e.profile_id) ?? e.number_of_servings,
	}));
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
	if (explicitProfileServings && explicitProfileServings.length > 0) {
		return {
			draft_entry_id: generateUUID(),
			locked,
			recipe: {
				id: candidate.id,
				name: candidate.name,
				calories_per_serving: candidate.calories_per_serving,
				macros_per_serving: { ...candidate.macros_per_serving },
				servings: candidate.servings,
				image_id: candidate.image_id,
				core_ingredients: [...candidate.core_ingredients],
				is_leftover: candidate.is_leftover,
				available_servings: candidate.available_servings,
				expires_after: candidate.expires_after,
			},
			profile_food_entries: explicitProfileServings,
		};
	}

	// Distribute servings proportionally based on each profile's per-slot calorie goal.
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
			servings: candidate.servings,
			image_id: candidate.image_id,
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
			const servings = Math.max(0.5, Math.round(raw * 2) / 2);
			return { profile_id, number_of_servings: servings };
		}),
	};
}

/** Adds `days` to an ISO date string (YYYY-MM-DD) and returns the result as YYYY-MM-DD. */
function addDays(isoDate: string, days: number): string {
	return dateFnsAddDays(new Date(`${isoDate}T00:00:00Z`), days)
		.toISOString()
		.slice(0, 10);
}
