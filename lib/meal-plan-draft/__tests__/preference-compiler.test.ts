import type {
	DraftSlot,
	HardFilter,
	MealPlanDraft,
	PrefPatchOp,
	SlotKey,
} from "../types";
import {
	compilePreferences,
	compilePreferencesForSlots,
	dayOfWeekFromDate,
} from "../preference-compiler";

// ==========================================
// Test fixtures
// ==========================================

function makeSlot(date: string, meal_type: DraftSlot["meal_type"]): DraftSlot {
	return {
		date,
		meal_type,
		entries: [],
	};
}

function makeDraft(
	slots: Record<SlotKey, DraftSlot>,
	preference_patch_stack: PrefPatchOp[] = [],
): Pick<MealPlanDraft, "slots" | "preference_patch_stack"> {
	return { slots, preference_patch_stack };
}

/** 2026-03-30 is a Monday */
const MONDAY = "2026-03-30";
/** 2026-03-31 is a Tuesday */
const TUESDAY = "2026-03-31";
/** 2026-04-04 is a Saturday */
const SATURDAY = "2026-04-04";

const mondayDinnerKey: SlotKey = `${MONDAY}.Dinner`;
const mondayBreakfastKey: SlotKey = `${MONDAY}.Breakfast`;
const tuesdayDinnerKey: SlotKey = `${TUESDAY}.Dinner`;
const saturdayLunchKey: SlotKey = `${SATURDAY}.Lunch`;

const twoSlotDraft = makeDraft({
	[mondayDinnerKey]: makeSlot(MONDAY, "Dinner"),
	[tuesdayDinnerKey]: makeSlot(TUESDAY, "Dinner"),
});

const fullWeekDraft = makeDraft({
	[mondayDinnerKey]: makeSlot(MONDAY, "Dinner"),
	[mondayBreakfastKey]: makeSlot(MONDAY, "Breakfast"),
	[tuesdayDinnerKey]: makeSlot(TUESDAY, "Dinner"),
	[saturdayLunchKey]: makeSlot(SATURDAY, "Lunch"),
});

const excludeKaleFilter: HardFilter = {
	type: "exclude_ingredient",
	value: "kale",
};

const maxPrepFilter: HardFilter = {
	type: "max_prep_time",
	value: 20,
	unit: "minutes",
};

// ==========================================
// dayOfWeekFromDate
// ==========================================

describe("dayOfWeekFromDate", () => {
	it("correctly maps Monday", () => {
		expect(dayOfWeekFromDate(MONDAY)).toBe("monday");
	});

	it("correctly maps Tuesday", () => {
		expect(dayOfWeekFromDate(TUESDAY)).toBe("tuesday");
	});

	it("correctly maps Saturday", () => {
		expect(dayOfWeekFromDate(SATURDAY)).toBe("saturday");
	});

	it("correctly maps Sunday (2026-04-05)", () => {
		expect(dayOfWeekFromDate("2026-04-05")).toBe("sunday");
	});
});

// ==========================================
// Default weights
// ==========================================

describe("compilePreferences — default weights", () => {
	it("outputs all 7 weight signals defaulting to 1.0 when no patches are applied", () => {
		const result = compilePreferences(twoSlotDraft);
		const weights = result[mondayDinnerKey].weights;

		expect(weights.protein_ratio).toBe(1.0);
		expect(weights.calorie_density).toBe(1.0);
		expect(weights.prep_time).toBe(1.0);
		expect(weights.novelty).toBe(1.0);
		expect(weights.source_preference).toBe(1.0);
		expect(weights.ingredient_overlap).toBe(1.0);
		expect(weights.leftover).toBe(1.0);
	});

	it("outputs empty hard_filters and null assigned_recipe_id by default", () => {
		const result = compilePreferences(twoSlotDraft);
		expect(result[mondayDinnerKey].hard_filters).toEqual([]);
		expect(result[mondayDinnerKey].assigned_recipe_id).toBeNull();
	});
});

// ==========================================
// Global patches
// ==========================================

describe("compilePreferences — global patches (scope: null)", () => {
	it("applies a global add_filter to every slot", () => {
		const draft = makeDraft(twoSlotDraft.slots, [
			{
				op: "pref_patch",
				action: "add_filter",
				scope: null,
				payload: { filter: excludeKaleFilter },
			},
		]);

		const result = compilePreferences(draft);

		expect(result[mondayDinnerKey].hard_filters).toContainEqual(
			excludeKaleFilter,
		);
		expect(result[tuesdayDinnerKey].hard_filters).toContainEqual(
			excludeKaleFilter,
		);
	});

	it("applies a global set_weight to every slot", () => {
		const draft = makeDraft(twoSlotDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "protein_ratio", value: 2.0 } },
			},
		]);

		const result = compilePreferences(draft);

		expect(result[mondayDinnerKey].weights.protein_ratio).toBe(2.0);
		expect(result[tuesdayDinnerKey].weights.protein_ratio).toBe(2.0);
	});

	it("remove_filter removes only the targeted filter, leaving others intact", () => {
		const draft = makeDraft(twoSlotDraft.slots, [
			{
				op: "pref_patch",
				action: "add_filter",
				scope: null,
				payload: { filter: excludeKaleFilter },
			},
			{
				op: "pref_patch",
				action: "add_filter",
				scope: null,
				payload: { filter: maxPrepFilter },
			},
			{
				op: "pref_patch",
				action: "remove_filter",
				scope: null,
				payload: { filter: excludeKaleFilter },
			},
		]);

		const result = compilePreferences(draft);

		expect(result[mondayDinnerKey].hard_filters).not.toContainEqual(
			excludeKaleFilter,
		);
		expect(result[mondayDinnerKey].hard_filters).toContainEqual(maxPrepFilter);
	});

	it("remove_weight resets a signal to the default 1.0", () => {
		const draft = makeDraft(twoSlotDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "novelty", value: 3.0 } },
			},
			{
				op: "pref_patch",
				action: "remove_weight",
				scope: null,
				payload: { weight: { signal: "novelty", value: 3.0 } },
			},
		]);

		const result = compilePreferences(draft);
		expect(result[mondayDinnerKey].weights.novelty).toBe(1.0);
	});
});

// ==========================================
// Scoped patches
// ==========================================

describe("compilePreferences — scoped patches", () => {
	it("day-only scope applies to all meal types for that day only", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { days: ["monday"] },
				payload: { weight: { signal: "prep_time", value: 1.8 } },
			},
		]);

		const result = compilePreferences(draft);

		// Both monday slots should be boosted
		expect(result[mondayDinnerKey].weights.prep_time).toBe(1.8);
		expect(result[mondayBreakfastKey].weights.prep_time).toBe(1.8);
		// Tuesday is unaffected
		expect(result[tuesdayDinnerKey].weights.prep_time).toBe(1.0);
		// Saturday is unaffected
		expect(result[saturdayLunchKey].weights.prep_time).toBe(1.0);
	});

	it("meal_type-only scope applies to that meal type across all days", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { meal_types: ["Dinner"] },
				payload: { weight: { signal: "calorie_density", value: 0.5 } },
			},
		]);

		const result = compilePreferences(draft);

		expect(result[mondayDinnerKey].weights.calorie_density).toBe(0.5);
		expect(result[tuesdayDinnerKey].weights.calorie_density).toBe(0.5);
		// Breakfast and Lunch are unaffected
		expect(result[mondayBreakfastKey].weights.calorie_density).toBe(1.0);
		expect(result[saturdayLunchKey].weights.calorie_density).toBe(1.0);
	});

	it("day + meal_type scope applies only to that exact combination", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "add_filter",
				scope: { days: ["monday"], meal_types: ["Dinner"] },
				payload: { filter: maxPrepFilter },
			},
		]);

		const result = compilePreferences(draft);

		expect(result[mondayDinnerKey].hard_filters).toContainEqual(maxPrepFilter);
		// Monday Breakfast is NOT the same meal_type
		expect(result[mondayBreakfastKey].hard_filters).not.toContainEqual(
			maxPrepFilter,
		);
		// Tuesday Dinner is NOT the same day
		expect(result[tuesdayDinnerKey].hard_filters).not.toContainEqual(
			maxPrepFilter,
		);
	});
});

// ==========================================
// Precedence: narrower scope wins
// ==========================================

describe("compilePreferences — scope precedence", () => {
	it("day + meal_type scoped patch overrides a global patch for the same signal", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			// Global: novelty = 0.5
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "novelty", value: 0.5 } },
			},
			// Scoped to monday.Dinner: novelty = 2.5 (should win)
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { days: ["monday"], meal_types: ["Dinner"] },
				payload: { weight: { signal: "novelty", value: 2.5 } },
			},
		]);

		const result = compilePreferences(draft);

		// Monday Dinner: scoped wins
		expect(result[mondayDinnerKey].weights.novelty).toBe(2.5);
		// Monday Breakfast: only global applies
		expect(result[mondayBreakfastKey].weights.novelty).toBe(0.5);
		// Tuesday Dinner: only global applies
		expect(result[tuesdayDinnerKey].weights.novelty).toBe(0.5);
	});

	it("day-only scope overrides global for that day", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "source_preference", value: 0.3 } },
			},
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { days: ["monday"] },
				payload: { weight: { signal: "source_preference", value: 1.9 } },
			},
		]);

		const result = compilePreferences(draft);

		expect(result[mondayDinnerKey].weights.source_preference).toBe(1.9);
		expect(result[mondayBreakfastKey].weights.source_preference).toBe(1.9);
		expect(result[tuesdayDinnerKey].weights.source_preference).toBe(0.3);
	});

	it("meal_type-only scope overrides global for that meal type", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "leftover", value: 0.2 } },
			},
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { meal_types: ["Lunch"] },
				payload: { weight: { signal: "leftover", value: 1.7 } },
			},
		]);

		const result = compilePreferences(draft);

		expect(result[saturdayLunchKey].weights.leftover).toBe(1.7);
		expect(result[mondayDinnerKey].weights.leftover).toBe(0.2);
	});

	it("day+meal_type overrides both day-only and meal_type-only scopes", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			// Global
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "ingredient_overlap", value: 0.1 } },
			},
			// Day-only (monday)
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { days: ["monday"] },
				payload: { weight: { signal: "ingredient_overlap", value: 0.5 } },
			},
			// Meal-type-only (Dinner)
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { meal_types: ["Dinner"] },
				payload: { weight: { signal: "ingredient_overlap", value: 0.8 } },
			},
			// Day + meal_type (monday.Dinner) — should win
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { days: ["monday"], meal_types: ["Dinner"] },
				payload: { weight: { signal: "ingredient_overlap", value: 2.0 } },
			},
		]);

		const result = compilePreferences(draft);

		// monday.Dinner: day+meal_type wins
		expect(result[mondayDinnerKey].weights.ingredient_overlap).toBe(2.0);
		// monday.Breakfast: day-only wins over global
		expect(result[mondayBreakfastKey].weights.ingredient_overlap).toBe(0.5);
		// tuesday.Dinner: meal_type-only wins over global
		expect(result[tuesdayDinnerKey].weights.ingredient_overlap).toBe(0.8);
		// saturday.Lunch: only global applies
		expect(result[saturdayLunchKey].weights.ingredient_overlap).toBe(0.1);
	});
});

// ==========================================
// Profile defaults
// ==========================================

describe("compilePreferences — profile defaults", () => {
	it("respects profile default filters when no patches are present", () => {
		const result = compilePreferences(twoSlotDraft, {
			hard_filters: [excludeKaleFilter],
		});

		expect(result[mondayDinnerKey].hard_filters).toContainEqual(
			excludeKaleFilter,
		);
	});

	it("a global add_filter does not create duplicate entries for the same filter key", () => {
		const draft = makeDraft(twoSlotDraft.slots, [
			{
				op: "pref_patch",
				action: "add_filter",
				scope: null,
				payload: { filter: excludeKaleFilter },
			},
		]);

		const result = compilePreferences(draft, {
			hard_filters: [excludeKaleFilter], // Same filter as profile default
		});

		const kaleFilters = result[mondayDinnerKey].hard_filters.filter(
			(f) => f.type === "exclude_ingredient" && f.value === "kale",
		);
		expect(kaleFilters).toHaveLength(1);
	});

	it("uses profile default assigned_recipe_id when present", () => {
		const result = compilePreferences(twoSlotDraft, {
			assigned_recipe_id: "recipe-123",
		});

		expect(result[mondayDinnerKey].assigned_recipe_id).toBe("recipe-123");
	});
});

// ==========================================
// compilePreferencesForSlots
// ==========================================

describe("compilePreferencesForSlots", () => {
	it("only returns compiled preferences for the targeted slots", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "novelty", value: 1.5 } },
			},
		]);

		const result = compilePreferencesForSlots(draft, [
			mondayDinnerKey,
			saturdayLunchKey,
		]);

		expect(Object.keys(result)).toHaveLength(2);
		expect(result[mondayDinnerKey]).toBeDefined();
		expect(result[saturdayLunchKey]).toBeDefined();
		expect(result[tuesdayDinnerKey]).toBeUndefined();
		expect(result[mondayBreakfastKey]).toBeUndefined();
	});

	it("still correctly applies patches within the filtered set", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "set_weight",
				scope: null,
				payload: { weight: { signal: "prep_time", value: 0.7 } },
			},
		]);

		const result = compilePreferencesForSlots(draft, [mondayDinnerKey]);
		expect(result[mondayDinnerKey].weights.prep_time).toBe(0.7);
	});
});

// ==========================================
// Determinism
// ==========================================

describe("compilePreferences — determinism", () => {
	it("produces identical output on successive calls with the same inputs", () => {
		const draft = makeDraft(fullWeekDraft.slots, [
			{
				op: "pref_patch",
				action: "add_filter",
				scope: null,
				payload: { filter: excludeKaleFilter },
			},
			{
				op: "pref_patch",
				action: "set_weight",
				scope: { days: ["monday"] },
				payload: { weight: { signal: "protein_ratio", value: 1.5 } },
			},
		]);

		const result1 = compilePreferences(draft);
		const result2 = compilePreferences(draft);

		expect(result1).toEqual(result2);
	});
});
