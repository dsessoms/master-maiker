import type {
	InterpreterFinalResponse,
	ResolvedRecipe,
} from "@/lib/meal-plan-draft/interpreter-schema";
import type { PrefPatchOp } from "@/lib/schemas/meal-plans/generate/draft-schema";

import { Spoonacular } from "@/lib/server/spoonacular/spoonacular-helper";
import { dayOfWeekFromDate } from "@/lib/meal-plan-draft";
import { supabase } from "@/config/supabase-server";

// ==========================================
// Type for draft context input
// ==========================================

export interface DraftContextInput {
	session_id: string;
	included_profile_ids: string[];
	slots: Record<
		string,
		{
			date: string;
			meal_type: string;
			entries: {
				draft_entry_id: string;
				recipe: { id: string; name: string };
				locked: boolean;
			}[];
		}
	>;
	preference_patch_stack: PrefPatchOp[];
}

// ==========================================
// enrichExcludeIngredientFilters
// ==========================================

/**
 * Walks the interpreter response and enriches every `exclude_ingredient`
 * filter with a `spoonacular_ingredient_id` resolved via the Spoonacular API.
 *
 * This runs server-side after LLM output is validated so the LLM never needs
 * to know about Spoonacular IDs. The generator then uses the ID alongside the
 * name string for more precise ingredient-level filtering.
 *
 * Lookups for duplicate ingredient names are deduplicated. If a lookup fails
 * (network error, ingredient not found) the filter is returned as-is — the
 * name-based fallback in the generator still applies.
 */
export async function enrichExcludeIngredientFilters(
	response: InterpreterFinalResponse,
): Promise<InterpreterFinalResponse> {
	const ingredientNames = new Set<string>();
	for (const op of response.operations) {
		if (
			op.op === "pref_patch" &&
			op.action === "add_filter" &&
			op.payload.filter?.type === "exclude_ingredient"
		) {
			ingredientNames.add(op.payload.filter.value as string);
		}
	}

	if (ingredientNames.size === 0) return response;

	const idByName = await Spoonacular.lookupIngredientIds([...ingredientNames]);

	return {
		...response,
		operations: response.operations.map((op) => {
			if (
				op.op !== "pref_patch" ||
				op.action !== "add_filter" ||
				op.payload.filter?.type !== "exclude_ingredient"
			) {
				return op;
			}
			const ingredientName = op.payload.filter.value as string;
			const spoonacularId = idByName.get(ingredientName);
			if (spoonacularId == null) return op;
			return {
				...op,
				payload: {
					...op.payload,
					filter: {
						...op.payload.filter,
						spoonacular_ingredient_id: spoonacularId,
					},
				},
			};
		}),
	};
}

// ==========================================
// findInvalidRecipeIds
// ==========================================

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns any recipe_id values in assign operations that are not valid UUIDs.
 * Catches placeholder strings like "unknown", "N/A", "TBD" before they reach the client.
 */
export function findInvalidRecipeIds(operations: unknown[]): string[] {
	const invalid: string[] = [];
	for (const op of operations) {
		const o = op as Record<string, unknown>;
		if (o.op === "plan_edit" && o.action === "assign") {
			const payload = o.payload as Record<string, unknown> | undefined;
			const recipeId = payload?.recipe_id;
			if (typeof recipeId === "string" && !UUID_REGEX.test(recipeId)) {
				invalid.push(recipeId);
			}
		}
	}
	return invalid;
}

// ==========================================
// findInvalidDates
// ==========================================

/**
 * Returns any date strings referenced in operations that are not present in
 * the draft. Catches hallucinated dates before they reach the client.
 */
export function findInvalidDates(
	operations: unknown[],
	validDates: Set<string>,
): string[] {
	const invalid: string[] = [];
	for (const op of operations) {
		const dates = extractDatesFromOp(op as Record<string, unknown>);
		for (const date of dates) {
			if (!validDates.has(date) && !invalid.includes(date)) {
				invalid.push(date);
			}
		}
	}
	return invalid;
}

function extractDatesFromOp(op: Record<string, unknown>): string[] {
	const dates: string[] = [];
	const payload = op.payload as Record<string, unknown> | undefined;
	if (payload) {
		collectDatesFromTarget(payload.target, dates);
		collectDatesFromTarget(payload.to, dates);
	}
	// regenerate_slots uses op.target directly
	collectDatesFromTarget(op.target, dates);
	return dates;
}

function collectDatesFromTarget(target: unknown, out: string[]): void {
	if (!target || target === "all") return;
	if (Array.isArray(target)) {
		for (const t of target) {
			if (typeof t === "object" && t !== null && "date" in t) {
				out.push((t as { date: string }).date);
			}
		}
	} else if (
		typeof target === "object" &&
		target !== null &&
		"date" in target
	) {
		out.push((target as { date: string }).date);
	}
}

// ==========================================
// summaryImpliesActions
// ==========================================

/**
 * Returns true if the interpretation_summary contains action verbs that imply
 * operations should have been emitted. Used to catch the "empty ops + planning
 * summary" mismatch before returning a bad response to the client.
 *
 * Matches both present and past tense so that phrases like "Removed pumpkin
 * chili from the plan" are caught just as reliably as "will regenerate".
 *
 * NOT matched (valid empty-ops cases):
 *   - "Undo is handled client-side."
 *   - "The recipe wasn't found in your library."
 *   - "Could not add it to your plan."
 *   - "No changes needed."
 */
export function summaryImpliesActions(summary: string): boolean {
	// Strip negated verb phrases before testing so that "could not add",
	// "unable to find", "didn't regenerate", etc. are not treated as actions.
	const withoutNegations = summary.replace(
		/\b(could\s+not|would\s+not|did\s+not|was\s+not|were\s+not|can\s+not|cannot|don't|didn't|wasn't|weren't|unable\s+to|failed?\s+to|not)\s+\w+/gi,
		" ",
	);
	return /\b(unlock(ed)?|lock(ed)?|clear(ed)?|regenerat(ed|ing)?|assign(ed)?|swap(ped)?|mov(ed|ing)?|cop(ied|ying)?|remov(ed|ing)?|ban(ned)?|replac(ed)?|updat(ed)?|chang(ed)?|exclud(ed|ing)?|add(ed)?|plac(ed)?|trigger(ed)?|should\s+(have|get|receive)|will|going\s+to)\b/i.test(
		withoutNegations,
	);
}

// ==========================================
// searchRecipes
// ==========================================

/**
 * Search the current user's recipe library for recipes matching any of the
 * provided queries. Splits each query on whitespace AND hyphens before
 * building ilike filters so that "cottage-cheese" matches "cottage cheese".
 */
export async function searchRecipes(
	userId: string,
	queries: string[],
): Promise<ResolvedRecipe[]> {
	console.debug("called search", queries);
	const baseTerms = queries.flatMap((q) =>
		q
			.toLowerCase()
			.split(/[\s\-]+/)
			.filter((t) => t.length > 1),
	);

	// Generate singular variants so that e.g. "enchiladas" also matches
	// "enchilada", "tomatoes" → "tomato", "berries" → "berry".
	const singular = (t: string): string | null => {
		if (t.endsWith("ies") && t.length > 4) return t.slice(0, -3) + "y";
		if (t.endsWith("oes") && t.length > 4) return t.slice(0, -2);
		if (t.endsWith("es") && t.length > 3) return t.slice(0, -1);
		if (t.endsWith("s") && t.length > 3) return t.slice(0, -1);
		return null;
	};

	const terms = [
		...new Set([
			...baseTerms,
			...baseTerms.flatMap((t) => {
				const s = singular(t);
				return s ? [s] : [];
			}),
		]),
	];

	if (terms.length === 0) return [];

	const ilikeFilters = terms
		.map((t) => `name.ilike.%${t}%,description.ilike.%${t}%`)
		.join(",");

	const { data, error } = await supabase
		.from("recipe")
		.select("id, name, description")
		.or(ilikeFilters)
		.eq("user_id", userId)
		.limit(15);

	if (error) {
		console.error("[interpret] searchRecipes error:", error);
		return [];
	}

	return (data ?? []).map((r) => ({
		id: r.id as string,
		name: r.name as string,
		description: (r.description ?? null) as string | null,
	}));
}

// ==========================================
// buildDraftContext
// ==========================================

/**
 * Builds a compact text summary of the draft for inclusion in the LLM user turn.
 */
export function buildDraftContext(
	draft: DraftContextInput,
	profiles: { id: string; name: string }[] = [],
): string {
	const lines: string[] = [];

	const todayIso = new Date().toISOString().slice(0, 10);
	const todayDay = dayOfWeekFromDate(todayIso);
	lines.push(`Today: ${todayIso} (${todayDay})`);
	lines.push(`Session ID: ${draft.session_id}`);
	lines.push(`Profiles: ${draft.included_profile_ids.join(", ")}`);

	if (profiles.length > 0) {
		lines.push("");
		lines.push(
			"PROFILES LOOKUP (use profile_id for profile_servings in assign ops):",
		);
		for (const p of profiles) {
			lines.push(`  ${p.name.padEnd(20)} → ${p.id}`);
		}
	}

	const uniqueDates = [
		...new Set(Object.values(draft.slots).map((s) => s.date)),
	].sort();
	const dayToDate = new Map<string, string[]>();
	for (const date of uniqueDates) {
		const day = dayOfWeekFromDate(date);
		const existing = dayToDate.get(day) ?? [];
		existing.push(date);
		dayToDate.set(day, existing);
	}
	const DAY_ORDER = [
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
		"sunday",
	];
	lines.push("");
	lines.push(
		"DAY → DATE LOOKUP (REQUIRED: resolve all day-name references using ONLY this table):",
	);
	for (const day of DAY_ORDER) {
		const dates = dayToDate.get(day);
		if (dates) {
			lines.push(`  ${day.padEnd(10)} → ${dates.join(", ")}`);
		}
	}

	lines.push("");
	lines.push("SLOTS:");

	for (const [, slot] of Object.entries(draft.slots)) {
		const day = dayOfWeekFromDate(slot.date);
		const label = `${slot.date} (${day}) ${slot.meal_type}`;
		if (slot.entries.length === 0) {
			lines.push(`  ${label}: [empty]`);
		} else {
			const entryDescriptions = slot.entries.map((e) => {
				const lockLabel = e.locked ? " [LOCKED]" : "";
				return `${e.recipe.name} (recipe_id: ${e.recipe.id}, entry_id: ${e.draft_entry_id})${lockLabel}`;
			});
			lines.push(`  ${label}: ${entryDescriptions.join(", ")}`);
		}
	}

	if (draft.preference_patch_stack.length > 0) {
		lines.push("");
		lines.push(
			`ACTIVE PREFERENCE PATCHES (${draft.preference_patch_stack.length} total):`,
		);
		for (const patch of draft.preference_patch_stack) {
			lines.push(`  ${JSON.stringify(patch)}`);
		}
	} else {
		lines.push("");
		lines.push("ACTIVE PREFERENCE PATCHES: none");
	}

	return lines.join("\n");
}
