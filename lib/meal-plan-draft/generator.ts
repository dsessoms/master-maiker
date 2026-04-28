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
 *   3. Greedy selection + forward-fill  — most-constrained-first slot loop.
 *      Prefers reusing already-selected recipes (up to the variety cap),
 *      enforces same-day uniqueness, and forward-fills leftover servings into
 *      subsequent eligible slots within the freshness window.
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
} from "@/lib/schemas/meal-plans/generate/draft-schema";

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
	 * Controls the maximum number of times a recipe may appear in the plan.
	 *
	 *   high   — 1 appearance per recipe (every slot gets a unique recipe).
	 *   medium — up to 3 appearances per recipe (default).
	 *   low    — unlimited reuse (batch-cooking mode).
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
 * Maximum number of times a single recipe may appear across the whole plan
 * (across all meal types) at each variety level.
 *
 *   high   — 1 appearance per recipe (every slot gets a unique recipe).
 *   medium — up to 3 appearances per recipe.
 *   low    — unlimited reuse (batch-cooking mode).
 */
const MAX_USES_PER_RECIPE: Record<VarietyLevel, number> = {
	high: 1,
	medium: 3,
	low: Infinity,
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

// TODO: pull this into the preference parser since we have that information available and in a less hacky way
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
	prep_time: { min: number; max: number };
}

function computePoolStats(candidates: GeneratorCandidate[]): PoolStats {
	if (candidates.length === 0) {
		const zero = { min: 0, max: 0 };
		return { protein_ratio: zero, prep_time: zero };
	}

	const ratios = candidates.map((c) =>
		c.calories_per_serving > 0
			? c.macros_per_serving.protein_g / c.calories_per_serving
			: 0,
	);
	const preps = candidates.map((c) => c.prep_time_minutes);

	const minMax = (arr: number[]) => ({
		min: Math.min(...arr),
		max: Math.max(...arr),
	});

	return {
		protein_ratio: minMax(ratios),
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
 * Scores a candidate against weight signals. Higher score = more preferred.
 *
 * Signals:
 *   protein_ratio    — higher protein % of calories is better (ascending)
 *   prep_time        — lower prep time is better (descending)
 *   source_preference — library recipes preferred over catalog
 */
function scoreCandidate(
	candidate: GeneratorCandidate,
	stats: PoolStats,
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
		weights.prep_time *
		(1 -
			normalize(
				candidate.prep_time_minutes,
				stats.prep_time.min,
				stats.prep_time.max,
			));

	score += weights.source_preference * (candidate.source === "library" ? 1 : 0);

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

// ==========================================
// Remaining daily budget helpers
// ==========================================

/**
 * Pre-computes calories already consumed from locked entries, keyed by
 * date -> profile_id -> total calories. Used to cap per-slot calorie targets
 * at each profile's remaining daily budget.
 */
function buildDailyCaloriesConsumed(
	draft: Omit<MealPlanDraft, "undo_stack">,
): Map<string, Map<string, number>> {
	const consumed = new Map<string, Map<string, number>>();
	for (const slot of Object.values(draft.slots)) {
		for (const entry of slot.entries) {
			if (!entry.locked) continue;
			if (!consumed.has(slot.date)) consumed.set(slot.date, new Map());
			const dayMap = consumed.get(slot.date)!;
			for (const pfe of entry.profile_food_entries) {
				dayMap.set(
					pfe.profile_id,
					(dayMap.get(pfe.profile_id) ?? 0) +
						pfe.number_of_servings * entry.recipe.calories_per_serving,
				);
			}
		}
	}
	return consumed;
}

/**
 * Returns per-profile effective calorie goals for a slot. Each profile's goal
 * is capped at `min(ideal_per_slot, remaining_daily_budget)` so that
 * already-consumed calories are respected.
 */
function computePerProfileEffectiveGoals(
	profileTargets: ProfileCalorieTarget[],
	includedProfileIds: string[],
	activeMealTypes: MealType[],
	date: string,
	dailyCaloriesConsumed: Map<string, Map<string, number>>,
): { profile_id: string; effective_goal: number }[] {
	const mealCount = activeMealTypes.length > 0 ? activeMealTypes.length : 3;
	const dayMap = dailyCaloriesConsumed.get(date);
	return includedProfileIds.map((pid) => {
		const target = profileTargets.find((p) => p.profile_id === pid);
		const dailyGoal =
			target?.daily_calorie_goal ?? FALLBACK_CALORIES_PER_SLOT * mealCount;
		const idealPerSlot = dailyGoal / mealCount;
		const consumed = dayMap?.get(pid) ?? 0;
		const remaining = Math.max(0, dailyGoal - consumed);
		return {
			profile_id: pid,
			effective_goal: Math.min(idealPerSlot, remaining),
		};
	});
}

/**
 * Total calorie target for a slot: sum of each profile's effective goal
 * (ideal per-slot, capped at remaining daily budget).
 */
function computeRemainingSlotTarget(
	profileTargets: ProfileCalorieTarget[],
	includedProfileIds: string[],
	activeMealTypes: MealType[],
	date: string,
	dailyCaloriesConsumed: Map<string, Map<string, number>>,
): number {
	return computePerProfileEffectiveGoals(
		profileTargets,
		includedProfileIds,
		activeMealTypes,
		date,
		dailyCaloriesConsumed,
	).reduce((sum, { effective_goal }) => sum + effective_goal, 0);
}

/**
 * Distributes `neededServings` across profiles proportional to each profile's
 * effective calorie goal (already capped at their remaining daily budget).
 */
function computeProfileServingsForSlot(
	neededServings: number,
	profileTargets: ProfileCalorieTarget[],
	includedProfileIds: string[],
	activeMealTypes: MealType[],
	date: string,
	dailyCaloriesConsumed: Map<string, Map<string, number>>,
): DraftProfileFoodEntry[] {
	const goals = computePerProfileEffectiveGoals(
		profileTargets,
		includedProfileIds,
		activeMealTypes,
		date,
		dailyCaloriesConsumed,
	);
	const totalGoal = goals.reduce((sum, g) => sum + g.effective_goal, 0);
	return goals.map(({ profile_id, effective_goal }) => {
		const proportion =
			totalGoal > 0
				? effective_goal / totalGoal
				: 1 / includedProfileIds.length;
		const raw = neededServings * proportion;
		const servings = Math.max(0.5, Math.round(raw * 2) / 2);
		return { profile_id, number_of_servings: servings };
	});
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
	const maxUses = MAX_USES_PER_RECIPE[variety];

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

	const eligibleCandidates = computeEligibleCandidates(
		slotsToProcess,
		draft,
		globalFilteredPool,
		compiled_prefs,
	);

	const poolStats = computePoolStats(globalFilteredPool);

	// Sort slots: assigned/locked first (seed state), then by eligible count ascending
	// (fewest eligible = most constrained = process first).
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
	// Phase 3: Greedy selection + forward-fill
	// ==========================================

	// Total slot appearances per recipe ID — used to enforce variety caps and
	// to identify candidates eligible for reuse.
	const recipeUseCounts = new Map<string, number>();

	// Final per-slot assignments.
	const slotAssignments = new Map<SlotKey, SlotAssignment>();

	// Recipe IDs per date — enforces same-day meal uniqueness.
	const dailyAssignments = new Map<string, Set<string>>();

	// Calories consumed per profile per day from locked entries.
	// Used to cap each profile's per-slot calorie target at their remaining budget.
	const dailyCaloriesConsumed = buildDailyCaloriesConsumed(draft);

	const generatorErrors: GeneratorSlotResult[] = [];

	function recordDailyAssignment(date: string, recipeId: string): void {
		if (!dailyAssignments.has(date)) dailyAssignments.set(date, new Set());
		dailyAssignments.get(date)!.add(recipeId);
	}

	function incrementUseCount(recipeId: string): void {
		recipeUseCounts.set(recipeId, (recipeUseCounts.get(recipeId) ?? 0) + 1);
	}

	/**
	 * Updates dailyCaloriesConsumed after a slot is assigned so subsequent slots
	 * on the same day see accurate remaining budgets.
	 */
	function recordCaloriesConsumed(
		date: string,
		profileServings: DraftProfileFoodEntry[],
		caloriesPerServing: number,
	): void {
		if (!dailyCaloriesConsumed.has(date))
			dailyCaloriesConsumed.set(date, new Map());
		const dayMap = dailyCaloriesConsumed.get(date)!;
		for (const pfe of profileServings) {
			dayMap.set(
				pfe.profile_id,
				(dayMap.get(pfe.profile_id) ?? 0) +
					pfe.number_of_servings * caloriesPerServing,
			);
		}
	}

	// Pre-seed state from locked entries across ALL slots so the generator
	// treats them as already-used when computing reuse eligibility and
	// same-day uniqueness.
	for (const key of allSlotKeys) {
		const slot = draft.slots[key];
		for (const entry of slot.entries) {
			if (!entry.locked) continue;
			recordDailyAssignment(slot.date, entry.recipe.id);
			incrementUseCount(entry.recipe.id);
		}
	}

	// --- Main selection loop ---
	for (const slotKey of orderedSlots) {
		// Skip slots already filled by forward-fill from an earlier iteration.
		if (slotAssignments.has(slotKey)) continue;

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
								computeRemainingSlotTarget(
									profile_targets,
									draft.included_profile_ids,
									activeMealTypes,
									slot.date,
									dailyCaloriesConsumed,
								),
								assignedCandidate.calories_per_serving,
							);

				const finalProfileServings =
					resolvedServings ??
					computeProfileServingsForSlot(
						neededServings,
						profile_targets,
						draft.included_profile_ids,
						activeMealTypes,
						slot.date,
						dailyCaloriesConsumed,
					);

				slotAssignments.set(slotKey, {
					candidate: assignedCandidate,
					estimated_servings: neededServings,
					is_leftover_slot: false,
					locked: true,
					explicit_profile_servings: finalProfileServings,
				});

				incrementUseCount(assignedCandidate.id);
				recordDailyAssignment(slot.date, assignedCandidate.id);
				recordCaloriesConsumed(
					slot.date,
					finalProfileServings,
					assignedCandidate.calories_per_serving,
				);
			}
			// Whether or not the recipe was found, the assign op owns this slot.
			continue;
		}

		// ---- Skip fully locked slots (seed use-count from them) ----
		const hasUnlocked =
			slot.entries.length === 0 || slot.entries.some((e) => !e.locked);
		if (!hasUnlocked) {
			for (const entry of slot.entries) {
				recordDailyAssignment(slot.date, entry.recipe.id);
				incrementUseCount(entry.recipe.id);
			}
			continue;
		}

		// ---- Build dynamic eligible set (same-day filter only) ----
		const staticEligible = eligibleCandidates[slotKey] ?? [];
		const dynamicEligible = staticEligible.filter(
			(c) => !dailyAssignments.get(slot.date)?.has(c.id),
		);

		// ---- Reuse check (absolute preference) ----
		// Look for candidates already in the plan that haven't hit the variety cap.
		const reusable = globalFilteredPool.filter(
			(c) =>
				recipeUseCounts.has(c.id) &&
				(recipeUseCounts.get(c.id) ?? 0) < maxUses &&
				passesHardFilters(c, prefs.hard_filters, slot.date, slot.meal_type) &&
				!dailyAssignments.get(slot.date)?.has(c.id),
		);

		let selected: GeneratorCandidate;

		if (reusable.length > 0) {
			const scored = reusable.map((c) => ({
				item: c,
				score: scoreCandidate(c, poolStats, prefs.weights),
			}));
			scored.sort((a, b) => b.score - a.score);
			selected = weightedTopKPick(scored, top_k, rng);
		} else if (dynamicEligible.length === 0) {
			generatorErrors.push({
				slot_key: slotKey,
				entry: null,
				errors: [{ reason: "over_constrained", filters: prefs.hard_filters }],
			});
			continue;
		} else {
			const scored = dynamicEligible.map((c) => ({
				item: c,
				score: scoreCandidate(c, poolStats, prefs.weights),
			}));
			scored.sort((a, b) => b.score - a.score);
			selected = weightedTopKPick(scored, top_k, rng);
		}

		const estimatedServings = computeNeededServings(
			computeRemainingSlotTarget(
				profile_targets,
				draft.included_profile_ids,
				activeMealTypes,
				slot.date,
				dailyCaloriesConsumed,
			),
			selected.calories_per_serving,
		);

		const estimatedProfileServings = computeProfileServingsForSlot(
			estimatedServings,
			profile_targets,
			draft.included_profile_ids,
			activeMealTypes,
			slot.date,
			dailyCaloriesConsumed,
		);

		// ---- Assign current slot ----
		slotAssignments.set(slotKey, {
			candidate: selected,
			estimated_servings: estimatedServings,
			is_leftover_slot: false,
			locked: false,
			explicit_profile_servings: estimatedProfileServings,
		});
		incrementUseCount(selected.id);
		recordDailyAssignment(slot.date, selected.id);
		recordCaloriesConsumed(
			slot.date,
			estimatedProfileServings,
			selected.calories_per_serving,
		);

		// ---- Forward-fill leftover slots ----
		// A recipe with more servings than needed covers subsequent eligible slots
		// within the freshness window, up to the variety cap.
		const maxLeftoverSlots =
			Math.floor(selected.servings / Math.max(1, estimatedServings)) - 1;

		if (maxLeftoverSlots > 0) {
			const expiresAfter = addDays(slot.date, LEFTOVER_FRESHNESS_DAYS);
			let leftoverCount = 0;

			// Iterate remaining unassigned slots in chronological order.
			const remainingUnassigned = orderedSlots
				.filter((k) => k !== slotKey && !slotAssignments.has(k))
				.sort((a, b) => draft.slots[a].date.localeCompare(draft.slots[b].date));

			for (const fillKey of remainingUnassigned) {
				if (leftoverCount >= maxLeftoverSlots) break;
				if ((recipeUseCounts.get(selected.id) ?? 0) >= maxUses) break;

				const fillSlot = draft.slots[fillKey];
				if (!fillSlot) continue;
				if (fillSlot.date <= slot.date) continue;
				if (fillSlot.date > expiresAfter) continue;

				const fillPrefs = compiled_prefs[fillKey];
				if (!fillPrefs) continue;

				if (
					!passesHardFilters(
						selected,
						fillPrefs.hard_filters,
						fillSlot.date,
						fillSlot.meal_type,
					)
				)
					continue;
				if (dailyAssignments.get(fillSlot.date)?.has(selected.id)) continue;

				const fillServings = computeNeededServings(
					computeRemainingSlotTarget(
						profile_targets,
						draft.included_profile_ids,
						activeMealTypes,
						fillSlot.date,
						dailyCaloriesConsumed,
					),
					selected.calories_per_serving,
				);
				const fillProfileServings = computeProfileServingsForSlot(
					fillServings,
					profile_targets,
					draft.included_profile_ids,
					activeMealTypes,
					fillSlot.date,
					dailyCaloriesConsumed,
				);
				slotAssignments.set(fillKey, {
					candidate: selected,
					estimated_servings: fillServings,
					is_leftover_slot: true,
					locked: false,
					explicit_profile_servings: fillProfileServings,
				});
				incrementUseCount(selected.id);
				recordDailyAssignment(fillSlot.date, selected.id);
				recordCaloriesConsumed(
					fillSlot.date,
					fillProfileServings,
					selected.calories_per_serving,
				);
				leftoverCount++;
			}
		}
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
