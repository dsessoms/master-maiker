import type {
	InterpreterOperation,
	MealPlanDraft,
	RegenerateSlotsOp,
	SlotKey,
} from "@/lib/schemas/meal-plans/generate/draft-schema";

import type { SlotAssignment } from "@/lib/meal-plan-draft/preference-compiler";
import { randomUUID } from "crypto";

export interface ApplyResult {
	draft: Omit<MealPlanDraft, "undo_stack">;
	regenerateOps: RegenerateSlotsOp[];
	slotAssignments: SlotAssignment[];
}

/**
 * Applies an array of interpreter operations to the draft (immutably).
 * Returns the updated draft along with any regenerate ops and slot assignments
 * that downstream generation needs.
 */
export function applyOperationsToDraft(
	draft: Omit<MealPlanDraft, "undo_stack">,
	operations: InterpreterOperation[],
): ApplyResult {
	let next = {
		...draft,
		slots: { ...draft.slots },
		preference_patch_stack: [...draft.preference_patch_stack],
	};

	const regenerateOps: RegenerateSlotsOp[] = [];
	const slotAssignments: SlotAssignment[] = [];

	for (const op of operations) {
		if (op.op === "pref_patch") {
			next.preference_patch_stack = [...next.preference_patch_stack, op];
		} else if (op.op === "plan_edit") {
			if (op.action === "lock" || op.action === "unlock") {
				const locked = op.action === "lock";
				const target = op.payload.target;
				const newSlots = { ...next.slots };

				if (target === "all" || !target) {
					for (const key of Object.keys(newSlots) as SlotKey[]) {
						newSlots[key] = {
							...newSlots[key],
							entries: newSlots[key].entries.map((e) => ({ ...e, locked })),
						};
					}
				} else {
					const targets = Array.isArray(target) ? target : [target];
					for (const t of targets) {
						const key: SlotKey = `${t.date}.${t.meal_type}`;
						if (newSlots[key]) {
							newSlots[key] = {
								...newSlots[key],
								entries: newSlots[key].entries.map((e) => ({ ...e, locked })),
							};
						}
					}
				}
				next.slots = newSlots;
			} else if (op.action === "clear") {
				const target = op.payload.target;
				const newSlots = { ...next.slots };
				if (!target || target === "all") {
					for (const key of Object.keys(newSlots) as SlotKey[]) {
						newSlots[key] = {
							...newSlots[key],
							entries: newSlots[key].entries.filter((e) => e.locked),
						};
					}
				} else {
					const targets = Array.isArray(target) ? target : [target];
					for (const t of targets) {
						const key: SlotKey = `${t.date}.${t.meal_type}`;
						if (newSlots[key]) {
							newSlots[key] = {
								...newSlots[key],
								entries: newSlots[key].entries.filter((e) => e.locked),
							};
						}
					}
				}
				next.slots = newSlots;
			} else if (op.action === "swap") {
				const rawTarget = Array.isArray(op.payload.target)
					? op.payload.target[0]
					: op.payload.target;
				const rawTo = Array.isArray(op.payload.to)
					? op.payload.to[0]
					: op.payload.to;

				if (
					rawTarget &&
					rawTarget !== "all" &&
					rawTo &&
					!Array.isArray(rawTo)
				) {
					const fromKey: SlotKey = `${rawTarget.date}.${rawTarget.meal_type}`;
					const toKey: SlotKey = `${rawTo.date}.${rawTo.meal_type}`;
					if (next.slots[fromKey] && next.slots[toKey]) {
						const fromEntries = next.slots[fromKey].entries;
						const toEntries = next.slots[toKey].entries;
						next.slots = {
							...next.slots,
							[fromKey]: { ...next.slots[fromKey], entries: toEntries },
							[toKey]: { ...next.slots[toKey], entries: fromEntries },
						};
					}
				}
			} else if (op.action === "move") {
				const rawTarget = Array.isArray(op.payload.target)
					? op.payload.target[0]
					: op.payload.target;
				const rawTo = Array.isArray(op.payload.to)
					? op.payload.to[0]
					: op.payload.to;

				if (
					rawTarget &&
					rawTarget !== "all" &&
					rawTo &&
					!Array.isArray(rawTo)
				) {
					const fromKey: SlotKey = `${rawTarget.date}.${rawTarget.meal_type}`;
					const toKey: SlotKey = `${rawTo.date}.${rawTo.meal_type}`;
					if (next.slots[fromKey] && next.slots[toKey]) {
						const movedEntries = next.slots[fromKey].entries;
						next.slots = {
							...next.slots,
							[fromKey]: { ...next.slots[fromKey], entries: [] },
							[toKey]: { ...next.slots[toKey], entries: movedEntries },
						};
					}
				}
			} else if (op.action === "copy") {
				const rawTarget = Array.isArray(op.payload.target)
					? op.payload.target[0]
					: op.payload.target;
				const destinations = op.payload.to
					? Array.isArray(op.payload.to)
						? op.payload.to
						: [op.payload.to]
					: [];

				if (rawTarget && rawTarget !== "all" && destinations.length > 0) {
					const fromKey: SlotKey = `${rawTarget.date}.${rawTarget.meal_type}`;
					if (next.slots[fromKey]) {
						const copiedEntries = next.slots[fromKey].entries.map((e) => ({
							...e,
							draft_entry_id: randomUUID(),
							locked: false,
						}));
						const newSlots = { ...next.slots };
						for (const dest of destinations) {
							const toKey: SlotKey = `${dest.date}.${dest.meal_type}`;
							if (newSlots[toKey]) {
								newSlots[toKey] = {
									...newSlots[toKey],
									entries: copiedEntries,
								};
							}
						}
						next.slots = newSlots;
					}
				}
			} else if (op.action === "assign") {
				const rawTarget = Array.isArray(op.payload.target)
					? op.payload.target[0]
					: op.payload.target;
				if (rawTarget && rawTarget !== "all" && op.payload.recipe_id) {
					regenerateOps.push({
						op: "regenerate_slots",
						target: [rawTarget],
					});
					slotAssignments.push({
						date: rawTarget.date,
						meal_type: rawTarget.meal_type,
						recipe_id: op.payload.recipe_id,
						...(op.payload.profile_servings
							? { profile_servings: op.payload.profile_servings }
							: {}),
					});
				}
			} else if (op.action === "add_slot") {
				const { meal_type } = op.payload;
				if (meal_type) {
					const existingDates = [
						...new Set(Object.values(next.slots).map((s) => s.date)),
					];
					const newSlots = { ...next.slots };
					for (const date of existingDates) {
						const key: SlotKey = `${date}.${meal_type}`;
						if (!newSlots[key]) {
							newSlots[key] = { date, meal_type, entries: [] };
						}
					}
					next.slots = newSlots;
				}
			} else if (op.action === "remove_slot") {
				const newSlots = { ...next.slots };
				const { meal_type, target } = op.payload;

				if (meal_type) {
					for (const key of Object.keys(newSlots) as SlotKey[]) {
						if (newSlots[key].meal_type === meal_type) {
							delete newSlots[key];
						}
					}
				} else if (target && target !== "all") {
					const targets = Array.isArray(target) ? target : [target];
					for (const t of targets) {
						const key: SlotKey = `${t.date}.${t.meal_type}`;
						delete newSlots[key];
					}
				}
				next.slots = newSlots;
			}
		} else if (op.op === "regenerate_slots") {
			regenerateOps.push(op);
		}
	}

	return { draft: next, regenerateOps, slotAssignments };
}
