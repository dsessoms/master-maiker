/**
 * Preference Compiler
 *
 * A deterministic, pure merge function that resolves the accumulated
 * `pref_patch` stack from a `MealPlanDraft` into a flat `CompiledSlotPreferences`
 * object per slot.
 *
 * Merge precedence (narrower scope wins on conflict):
 *   1. Day + meal_type scoped patch  (most specific)
 *   2. Day-only scoped patch
 *   3. Meal_type-only scoped patch
 *   4. Global patch  (scope: null)
 *   5. Profile defaults             (least specific)
 *
 * The compiler is the ONLY layer that understands scope. The generator
 * consumes the flat `CompilerOutput` and never touches the raw patch stack.
 */

import type {
	CompiledSlotPreferences,
	CompilerOutput,
	DayOfWeek,
	HardFilter,
	MealPlanDraft,
	MealType,
	PrefPatchOp,
	PrefScope,
	SlotKey,
	WeightSignal,
} from "./types";

// ==========================================
// Constants
// ==========================================

/** All weight signals default to 1.0 per the PRD. */
const DEFAULT_WEIGHTS: Record<WeightSignal, number> = {
	protein_ratio: 1.0,
	calorie_density: 1.0,
	prep_time: 1.0,
	novelty: 1.0,
	source_preference: 1.0,
	ingredient_overlap: 1.0,
	leftover: 1.0,
};

// ==========================================
// Scope helpers
// ==========================================

/**
 * A numeric rank representing how specific a patch scope is.
 * Higher = more specific = higher precedence.
 *
 * Ranks:
 *   0 — global  (scope: null)
 *   1 — meal_type only
 *   2 — day only
 *   3 — day + meal_type
 */
function scopeRank(scope: PrefScope | null): 0 | 1 | 2 | 3 {
	if (scope === null) return 0;
	const hasDay = (scope.days?.length ?? 0) > 0;
	const hasMealType = (scope.meal_types?.length ?? 0) > 0;
	if (hasDay && hasMealType) return 3;
	if (hasDay) return 2;
	if (hasMealType) return 1;
	// Empty scope object with no fields is treated as global
	return 0;
}

/**
 * Returns true if the patch scope applies to the given slot's day and meal_type.
 *
 * A `null` scope (global) always matches.
 * An empty scope object `{}` also matches globally.
 */
function scopeMatchesSlot(
	scope: PrefScope | null,
	slotDay: DayOfWeek,
	slotMealType: MealType,
): boolean {
	if (scope === null) return true;

	const dayMatch =
		!scope.days || scope.days.length === 0 || scope.days.includes(slotDay);
	const mealTypeMatch =
		!scope.meal_types ||
		scope.meal_types.length === 0 ||
		scope.meal_types.includes(slotMealType);

	return dayMatch && mealTypeMatch;
}

// ==========================================
// Filter merge helpers
// ==========================================

/**
 * A filter is uniquely identified by its type + JSON-serialised value.
 * This key is used to detect duplicate or conflicting filters.
 */
function filterKey(filter: HardFilter): string {
	return `${filter.type}::${JSON.stringify(filter.value)}`;
}

// ==========================================
// Compiler
// ==========================================

/**
 * Compiles the full preference patch stack from a draft into a flat
 * `CompiledSlotPreferences` per slot.
 *
 * Accepts the `slots` record separately so the compiler can be used with
 * a subset of slots (e.g., only target slots before regeneration) without
 * requiring a full `MealPlanDraft` object — useful for unit testing.
 */
export function compilePreferences(
	draft: Pick<MealPlanDraft, "slots" | "preference_patch_stack">,
	profileDefaults?: Partial<CompiledSlotPreferences>,
): CompilerOutput {
	const output: CompilerOutput = {};

	for (const slotKey of Object.keys(draft.slots) as SlotKey[]) {
		const slot = draft.slots[slotKey];
		const slotDay = dayOfWeekFromDate(slot.date);
		const slotMealType = slot.meal_type;

		// Start from profile defaults, then apply patches in increasing precedence.
		const compiled = compileSlot(
			slotKey,
			slotDay,
			slotMealType,
			draft.preference_patch_stack,
			profileDefaults,
		);

		output[slotKey] = compiled;
	}

	return output;
}

/**
 * Compiles preferences for a single slot by folding all applicable patches
 * over the defaults in order of precedence.
 *
 * Strategy:
 *   1. Collect all patches that match the slot, tagged with their rank.
 *   2. Sort by rank ascending (lowest precedence first) so higher-precedence
 *      patches are applied last and win on conflict.
 *   3. Apply each patch to build the merged filters and weights.
 */
function compileSlot(
	slotKey: SlotKey,
	slotDay: DayOfWeek,
	slotMealType: MealType,
	patches: PrefPatchOp[],
	profileDefaults?: Partial<CompiledSlotPreferences>,
): CompiledSlotPreferences {
	// Seed with defaults
	const weights: Record<WeightSignal, number> = {
		...DEFAULT_WEIGHTS,
		...profileDefaults?.weights,
	};

	// Use a Map keyed by filterKey so higher-precedence patches overwrite lower ones.
	// The Map preserves insertion order which matters for determinism.
	const filterMap = new Map<string, HardFilter>();

	// Pre-populate with profile default hard filters (rank: below global)
	for (const f of profileDefaults?.hard_filters ?? []) {
		filterMap.set(filterKey(f), f);
	}

	// Collect all matching patches with their rank
	const matchingPatches: { rank: 0 | 1 | 2 | 3; patch: PrefPatchOp }[] = [];

	for (const patch of patches) {
		if (scopeMatchesSlot(patch.scope, slotDay, slotMealType)) {
			matchingPatches.push({ rank: scopeRank(patch.scope), patch });
		}
	}

	// Sort ascending by rank so the most-specific patches are applied last
	// (stable sort preserves the original order within same-rank patches)
	matchingPatches.sort((a, b) => a.rank - b.rank);

	// Apply patches in rank order
	for (const { patch } of matchingPatches) {
		switch (patch.action) {
			case "add_filter": {
				if (patch.payload.filter) {
					const key = filterKey(patch.payload.filter);
					filterMap.set(key, patch.payload.filter);
				}
				break;
			}

			case "remove_filter": {
				if (patch.payload.filter) {
					const key = filterKey(patch.payload.filter);
					filterMap.delete(key);
				}
				break;
			}

			case "set_weight": {
				if (patch.payload.weight) {
					weights[patch.payload.weight.signal] = patch.payload.weight.value;
				}
				break;
			}

			case "remove_weight": {
				if (patch.payload.weight) {
					// Reset to default
					weights[patch.payload.weight.signal] =
						DEFAULT_WEIGHTS[patch.payload.weight.signal];
				}
				break;
			}
		}
	}

	// Resolve the assigned_recipe_id: use the profile default if present.
	// The generator will override this via `plan_edit(assign)` before calling
	// the compiler, so we do not need to scan the patch stack for it here.
	const assigned_recipe_id = profileDefaults?.assigned_recipe_id ?? null;

	return {
		hard_filters: Array.from(filterMap.values()),
		weights,
		assigned_recipe_id,
	};
}

// ==========================================
// Utility: derive DayOfWeek from an ISO date string
// ==========================================

const ISO_DAY_TO_DAY_OF_WEEK: DayOfWeek[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
];

/**
 * Derives the `DayOfWeek` enum value from an ISO date string (YYYY-MM-DD).
 *
 * Uses UTC to avoid timezone-dependent day shifts on the server, which
 * will typically run in UTC. For client-side use, callers should pass a
 * pre-resolved `DayOfWeek` if local timezone matters.
 */
export function dayOfWeekFromDate(isoDate: string): DayOfWeek {
	const date = new Date(`${isoDate}T00:00:00Z`);
	const index = date.getUTCDay(); // 0 = Sunday
	return ISO_DAY_TO_DAY_OF_WEEK[index];
}

/**
 * Compiles preferences for a specific subset of slots only.
 * Useful when the generator only needs to fill targeted slots.
 */
export function compilePreferencesForSlots(
	draft: Pick<MealPlanDraft, "slots" | "preference_patch_stack">,
	targetSlotKeys: SlotKey[],
	profileDefaults?: Partial<CompiledSlotPreferences>,
): CompilerOutput {
	const targetSet = new Set(targetSlotKeys);
	const filteredSlots = Object.fromEntries(
		Object.entries(draft.slots).filter(([key]) =>
			targetSet.has(key as SlotKey),
		),
	) as MealPlanDraft["slots"];

	return compilePreferences(
		{
			slots: filteredSlots,
			preference_patch_stack: draft.preference_patch_stack,
		},
		profileDefaults,
	);
}
