// ==========================================
// 1. Shared Base Types
// ==========================================

// Aligns with DB `public.meal_type_enum`
export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export type DayOfWeek =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

// Unique identifier for a slot, e.g., "2026-03-30.Dinner"
export type SlotKey = `${string}.${MealType}`;

export interface SlotTarget {
	date: string; // ISO Date string (YYYY-MM-DD)
	meal_type: MealType;
}

// ==========================================
// 2. Draft State Models (The Meal Plan)
// ==========================================

export interface DraftRecipe {
	id: string; // Maps to public.recipe.id
	name: string;
	calories_per_serving: number;
	macros_per_serving: {
		protein_g: number;
		carbs_g: number;
		fat_g: number;
	};
	yield: number;
	core_ingredients: string[];

	// Transient generator state
	is_leftover?: boolean;
	available_servings?: number;
	expires_after?: string; // ISO Date string
}

// Maps to `public.profile_food_entry`
export interface DraftProfileFoodEntry {
	profile_id: string;
	number_of_servings: number;
}

// Conceptually maps to a single `public.food_entry` row
export interface DraftFoodEntry {
	draft_entry_id: string; // Ephemeral UUID for UI keys and LLM specific targeting
	recipe: DraftRecipe;
	locked: boolean; // Lock state lives at the item level for granular control

	// 1..* entries defining who is eating this specific recipe and how much
	profile_food_entries: DraftProfileFoodEntry[];
}

export interface SlotError {
	reason: "over_constrained";
	filters: HardFilter[];
}

// The container for a Date + Meal Type
export interface DraftSlot {
	date: string; // ISO Date (YYYY-MM-DD), maps to food_entry.date
	meal_type: MealType; // Maps to food_entry.meal_type

	// Array format future-proofs for v2 (e.g. Main + Side).
	// For v1, the generator will simply populate this with an array of length 1.
	// An empty array means the slot is completely cleared/empty.
	entries: DraftFoodEntry[];

	// Generator errors stay at the slot level
	errors?: SlotError[];
}

export interface MealPlanDraft {
	session_id: string;
	included_profile_ids: string[];

	// Current structural layout and content of the plan
	slots: Record<SlotKey, DraftSlot>;

	// Accumulated history of preference constraints applied this session
	preference_patch_stack: PrefPatchOp[];

	// Undo history. Stored as partial or full snapshot states
	undo_stack: Omit<MealPlanDraft, "undo_stack">[];
}

// ==========================================
// 3. LLM Interpreter Operations
// ==========================================

export type HardFilterType =
	| "exclude_ingredient"
	| "dietary_restriction"
	| "max_prep_time"
	| "max_ingredient_count"
	| "include_cuisine"
	| "source_restriction";

/**
 * The value shape for each HardFilterType:
 *   exclude_ingredient   → string  (e.g. "kale")
 *   dietary_restriction  → string  (e.g. "vegan", "gluten-free")
 *   max_prep_time        → number  (minutes)
 *   max_ingredient_count → number
 *   include_cuisine      → string[] (e.g. ["italian", "japanese"])
 *   source_restriction   → "library" | "catalog"
 */
export type HardFilterValue = string | number | string[];

export interface HardFilter {
	type: HardFilterType;
	value: HardFilterValue;
	unit?: string; // e.g., "minutes"
}

export type WeightSignal =
	| "protein_ratio"
	| "calorie_density"
	| "prep_time"
	| "source_preference"
	| "ingredient_overlap"
	| "leftover";

export interface PrefScope {
	days?: DayOfWeek[];
	meal_types?: MealType[];
}

export interface PrefPatchOp {
	op: "pref_patch";
	action: "add_filter" | "remove_filter" | "set_weight" | "remove_weight";
	scope: PrefScope | null; // null = global application
	payload: {
		filter?: HardFilter;
		weight?: {
			signal: WeightSignal;
			value: number; // Target multiplier, default is 1.0
		};
	};
}

export interface PlanEditOp {
	op: "plan_edit";
	action:
		| "swap"
		| "move"
		| "copy"
		| "clear"
		| "assign"
		| "add_slot"
		| "remove_slot"
		| "lock"
		| "unlock";
	payload: {
		target?: SlotTarget | SlotTarget[] | "all";
		draft_entry_id?: string; // For targeting a specific recipe within a slot (e.g. locking just the main dish)
		to?: SlotTarget | SlotTarget[]; // For swap/move/copy
		recipe_id?: string; // For assign
		lock?: boolean; // For assign
		meal_type?: MealType; // For add_slot
	};
}

export interface RegenerateSlotsOp {
	op: "regenerate_slots";
	target: SlotTarget[] | null; // null targets all currently unlocked slots
}

export type InterpreterOperation = PrefPatchOp | PlanEditOp | RegenerateSlotsOp;

// ==========================================
// 4. Preference Compiler Output
// ==========================================

export interface CompiledSlotPreferences {
	hard_filters: HardFilter[];
	// Map of WeightSignals to their multiplied float values (e.g., prep_time: 1.0)
	weights: Record<WeightSignal, number>;

	// Pre-assigned by explicit LLM user command (bypasses generator search)
	assigned_recipe_id: string | null;
}

// The complete output passed from the Compiler to the Generator.
// Note: Lock state is omitted here because the generator derives what to fill
// by checking if the DraftSlot.entries array has unlocked items.
export type CompilerOutput = Record<SlotKey, CompiledSlotPreferences>;

// ==========================================
// 5. Interpreter API Contract
// ==========================================

export interface InterpreterRequest {
	user_message: string;
	draft: Omit<MealPlanDraft, "undo_stack">;
}

export interface InterpreterResponse {
	/** Ordered list of operations to apply this turn. */
	operations: InterpreterOperation[];
	/**
	 * Human-readable summary of what the interpreter understood.
	 * Surfaced by the UI to set user expectations on ambiguous requests.
	 */
	interpretation_summary: string;
	/**
	 * True when the interpreter resolved ambiguity with a reasonable assumption.
	 * The UI should surface `interpretation_summary` when this is true.
	 */
	is_ambiguous: boolean;
}
