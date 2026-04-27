import type {
	MealPlanDraft,
	MealType,
} from "@/lib/schemas/meal-plans/generate/draft-schema";

import type { VarietyLevel } from "@/lib/meal-plan-draft/generator";

export type RecipeSource = "library" | "catalog";
export type ExistingBehavior = "keep" | "replace";

export interface GeneratorSetup {
	/** ISO date strings (yyyy-MM-dd) for the days selected in the wizard */
	dateStrings: string[];
	/** Profile IDs that should be included in the plan */
	profileIds: string[];
	/** Which meal types to plan */
	mealTypes: MealType[];
	/** Which recipe pools to draw from */
	recipeSources: RecipeSource[];
	/** Whether to keep existing entries (lock them) or start fresh */
	existingBehavior: ExistingBehavior;
	/** How much recipe variety to enforce */
	variety: VarietyLevel;
}

export type GeneratorPhase = "setup" | "generating" | "chat";

/** The live draft — excludes the undo stack to keep it serialisable */
export type ActiveDraft = Omit<MealPlanDraft, "undo_stack">;

export interface TurnMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	is_ambiguous?: boolean;
}
