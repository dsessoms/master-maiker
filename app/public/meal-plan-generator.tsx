/**
 * Interpreter Test Harness
 *
 * A dev-only screen at /public/meal-plan-generator that lets you
 * talk to the LLM Interpreter and see exactly what operations it emits
 * and how the preference patch stack and draft state evolve across turns.
 *
 * Route: accessible without auth via expo-router's /public segment.
 */

import * as Crypto from "expo-crypto";

import {
	ActivityIndicator,
	ScrollView,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import type {
	DraftSlot,
	InterpreterOperation,
	MealPlanDraft,
	MealType,
	PrefPatchOp,
	RegenerateSlotsOp,
	SlotKey,
	SlotTarget,
} from "@/lib/meal-plan-draft/types";
import { useEffect, useMemo, useState } from "react";

import type { InterpreterResponseFromSchema } from "@/lib/meal-plan-draft/interpreter-schema";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { compilePreferences, type SlotAssignment } from "@/lib/meal-plan-draft";
import { useGenerateSlots } from "@/hooks/meal-plans/use-generate-slots";
import { useInterpretMealPlanMessage } from "@/hooks/meal-plans/use-interpret-meal-plan-message";
import { useProfiles } from "@/hooks/profiles/useProfiles";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

// ==========================================
// Constants
// ==========================================

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Returns the ISO date string for the Monday of the current week,
 * then offsets by `dayIndex` (0 = Mon … 6 = Sun).
 */
function isoWeekDate(dayIndex: number): string {
	const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
	return format(addDays(monday, dayIndex), "yyyy-MM-dd");
}

// ==========================================
// Draft builder (parameterised)
// ==========================================

function buildEmptyDraft(
	dates: string[],
	profileIds: string[],
): Omit<MealPlanDraft, "undo_stack"> {
	const slots: Record<SlotKey, DraftSlot> = {};
	for (const date of dates) {
		for (const meal_type of MEAL_TYPES) {
			const key: SlotKey = `${date}.${meal_type}`;
			slots[key] = { date, meal_type, entries: [] };
		}
	}
	return {
		session_id: Crypto.randomUUID(),
		included_profile_ids: profileIds,
		slots,
		preference_patch_stack: [],
	};
}

// ==========================================
// Sub-components
// ==========================================

function OpPill({ op }: { op: InterpreterOperation }) {
	const bgColor =
		op.op === "pref_patch"
			? "bg-blue-500/20 border-blue-500/40"
			: op.op === "plan_edit"
				? "bg-amber-500/20 border-amber-500/40"
				: "bg-green-500/20 border-green-500/40";

	const label =
		op.op === "pref_patch"
			? `pref_patch · ${op.action}`
			: op.op === "plan_edit"
				? `plan_edit · ${op.action}`
				: `regenerate_slots · ${op.target === null ? "all unlocked" : `${op.target.length} slot(s)`}`;

	return (
		<View className={`rounded border px-2 py-1 mb-1 ${bgColor}`}>
			<Text className="text-xs font-mono">{label}</Text>
			<Text
				className="text-xs text-muted-foreground font-mono"
				numberOfLines={3}
			>
				{JSON.stringify(
					"payload" in op ? op.payload : { target: op.target },
					null,
					2,
				)}
			</Text>
		</View>
	);
}

interface TurnMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	response?: InterpreterResponseFromSchema;
}

function DraftGrid({
	draft,
	profiles,
}: {
	draft: Omit<MealPlanDraft, "undo_stack">;
	profiles: { id: string; name: string }[];
}) {
	const dates = useMemo(
		() => [...new Set(Object.values(draft.slots).map((s) => s.date))].sort(),
		[draft.slots],
	);

	/** Total servings consumed for a single entry (all profiles combined). */
	function entryServingsUsed(entry: DraftSlot["entries"][number]): number {
		return entry.profile_food_entries.reduce(
			(s, pfe) => s + pfe.number_of_servings,
			0,
		);
	}

	/**
	 * Total servings consumed across ALL slots in the draft for a given recipe id.
	 * This gives the true utilisation of the recipe's yield when it appears in
	 * multiple slots (e.g. as a leftover).
	 */
	const totalServingsByRecipeId = useMemo(() => {
		const map = new Map<string, number>();
		for (const slot of Object.values(draft.slots)) {
			for (const entry of slot.entries) {
				const prev = map.get(entry.recipe.id) ?? 0;
				map.set(entry.recipe.id, prev + entryServingsUsed(entry));
			}
		}
		return map;
	}, [draft.slots]);

	/**
	 * The slot key where a recipe first appears (sorted by date, then by meal
	 * type order: Breakfast → Lunch → Dinner → Snack), used to decide which
	 * slot renders the combined yield badge.
	 *
	 * A plain lexicographic sort on SlotKey would put Dinner before Lunch
	 * (D < L alphabetically), so we sort explicitly by meal-type position.
	 */
	const firstSlotByRecipeId = useMemo(() => {
		const mealTypeOrder: Record<MealType, number> = {
			Breakfast: 0,
			Lunch: 1,
			Dinner: 2,
			Snack: 3,
		};

		const sortedKeys = (Object.keys(draft.slots) as SlotKey[]).sort((a, b) => {
			const slotA = draft.slots[a];
			const slotB = draft.slots[b];
			if (slotA.date !== slotB.date) return slotA.date < slotB.date ? -1 : 1;
			return mealTypeOrder[slotA.meal_type] - mealTypeOrder[slotB.meal_type];
		});

		const map = new Map<string, SlotKey>();
		for (const key of sortedKeys) {
			for (const entry of draft.slots[key].entries) {
				if (!map.has(entry.recipe.id)) {
					map.set(entry.recipe.id, key);
				}
			}
		}
		return map;
	}, [draft.slots]);

	return (
		<View>
			{dates.map((date) => (
				<View key={date} className="mb-2">
					<Text className="text-xs font-semibold text-muted-foreground mb-1">
						{`${format(parseISO(date), "EEEE")} - ${date}`}
					</Text>
					{MEAL_TYPES.map((meal_type) => {
						const key: SlotKey = `${date}.${meal_type}`;
						const slot = draft.slots[key];
						if (!slot) return null;
						const entry = slot.entries[0];
						const hasError = (slot.errors?.length ?? 0) > 0;

						// Yield utilisation — show total across all slots, but only on the
						// first slot where this recipe appears.
						const recipeYield = entry?.recipe.yield ?? 0;
						const firstSlotKey = entry
							? firstSlotByRecipeId.get(entry.recipe.id)
							: undefined;
						const isFirstOccurrence = entry != null && firstSlotKey === key;
						const totalServingsUsed = entry
							? (totalServingsByRecipeId.get(entry.recipe.id) ?? 0)
							: 0;
						const yieldPct =
							isFirstOccurrence && recipeYield > 0
								? Math.round((totalServingsUsed / recipeYield) * 100)
								: null;

						return (
							<View key={key} className="mb-2">
								<View className="flex-row items-center gap-2">
									<Text className="text-xs text-muted-foreground w-16">
										{meal_type}
									</Text>
									<View
										className={`flex-1 rounded px-2 py-1 ${
											hasError
												? "bg-red-500/20 border border-red-500/40"
												: entry?.locked
													? "bg-amber-500/20 border border-amber-500/40"
													: "bg-muted"
										}`}
									>
										<View className="flex-row items-center justify-between gap-1">
											<Text className="text-xs flex-1" numberOfLines={1}>
												{hasError
													? `⚠ ${slot.errors![0].reason}`
													: entry
														? `${entry.locked ? "🔒 " : ""}${entry.recipe.name}`
														: "—"}
											</Text>
											{entry?.recipe.is_leftover && (
												<View className="rounded px-1 bg-sky-500/20 border border-sky-500/40">
													<Text className="text-xs font-mono text-sky-400">
														leftover
													</Text>
												</View>
											)}
											{yieldPct !== null && (
												<View
													className={`rounded px-1 ${yieldPct >= 90 ? "bg-green-500/20" : yieldPct >= 50 ? "bg-amber-500/20" : "bg-muted"}`}
												>
													<Text className="text-xs font-mono text-muted-foreground">
														{yieldPct}%
													</Text>
												</View>
											)}
										</View>

										{/* Per-profile macro breakdown */}
										{entry && profiles.length > 0 && (
											<View className="mt-0.5 gap-0.5">
												{profiles.map((profile) => {
													const pfe = entry.profile_food_entries.find(
														(p) => p.profile_id === profile.id,
													);
													if (!pfe || pfe.number_of_servings === 0) return null;
													const m = entry.recipe.macros_per_serving;
													const s = pfe.number_of_servings;
													const cal = Math.round(
														entry.recipe.calories_per_serving * s,
													);
													const pg = Math.round(m.protein_g * s);
													const cg = Math.round(m.carbs_g * s);
													const fg = Math.round(m.fat_g * s);
													return (
														<Text
															key={profile.id}
															className="text-xs font-mono text-muted-foreground"
														>
															{`${profile.name} ×${s} → ${cal} kcal · P${pg} C${cg} F${fg}`}
														</Text>
													);
												})}
											</View>
										)}
									</View>
								</View>
							</View>
						);
					})}
				</View>
			))}
		</View>
	);
}

// ==========================================
// Average daily macro summary
// ==========================================

interface ProfileMacroTarget {
	id: string;
	name: string;
	daily_calorie_goal: number | null;
	protein_grams: number | null;
	carbs_grams: number | null;
	fat_grams: number | null;
}

interface DailyMacros {
	cal: number;
	protein: number;
	carbs: number;
	fat: number;
}

function DraftMacroSummary({
	draft,
	profiles,
}: {
	draft: Omit<MealPlanDraft, "undo_stack">;
	profiles: ProfileMacroTarget[];
}) {
	/**
	 * For each profile, sum total macros from all filled slots, then divide by
	 * the number of distinct dates that have at least one filled slot so the
	 * average isn't diluted by empty days.
	 */
	const avgByProfile = useMemo(() => {
		const totals = new Map<string, DailyMacros>();
		const filledDates = new Set<string>();

		for (const slot of Object.values(draft.slots)) {
			let slotHasEntry = false;
			for (const entry of slot.entries) {
				slotHasEntry = true;
				for (const pfe of entry.profile_food_entries) {
					if (pfe.number_of_servings === 0) continue;
					const s = pfe.number_of_servings;
					const m = entry.recipe.macros_per_serving;
					const prev = totals.get(pfe.profile_id) ?? {
						cal: 0,
						protein: 0,
						carbs: 0,
						fat: 0,
					};
					totals.set(pfe.profile_id, {
						cal: prev.cal + entry.recipe.calories_per_serving * s,
						protein: prev.protein + m.protein_g * s,
						carbs: prev.carbs + m.carbs_g * s,
						fat: prev.fat + m.fat_g * s,
					});
				}
			}
			if (slotHasEntry) filledDates.add(slot.date);
		}

		const dayCount = Math.max(1, filledDates.size);
		const result = new Map<string, DailyMacros>();
		for (const [profileId, t] of totals) {
			result.set(profileId, {
				cal: Math.round(t.cal / dayCount),
				protein: Math.round(t.protein / dayCount),
				carbs: Math.round(t.carbs / dayCount),
				fat: Math.round(t.fat / dayCount),
			});
		}
		return result;
	}, [draft.slots]);

	const includedProfiles = profiles.filter((p) =>
		draft.included_profile_ids.includes(p.id),
	);

	if (includedProfiles.length === 0 || avgByProfile.size === 0) {
		return (
			<Text className="text-xs text-muted-foreground italic mt-2">
				No data yet
			</Text>
		);
	}

	return (
		<View className="mt-3 pt-3 border-t border-border gap-2">
			<Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				Avg / Day
			</Text>
			{includedProfiles.map((profile) => {
				const avg = avgByProfile.get(profile.id);
				if (!avg) return null;

				const goalCal = profile.daily_calorie_goal;
				const calPct =
					goalCal && goalCal > 0 ? Math.round((avg.cal / goalCal) * 100) : null;
				const calColor =
					calPct == null
						? "text-muted-foreground"
						: calPct >= 90 && calPct <= 110
							? "text-green-400"
							: calPct >= 75 && calPct <= 125
								? "text-amber-400"
								: "text-red-400";

				return (
					<View key={profile.id} className="gap-0.5">
						<Text className="text-xs font-medium text-foreground">
							{profile.name}
						</Text>
						<Text className={`text-xs font-mono ${calColor}`}>
							{`${avg.cal} kcal${calPct != null ? ` (${calPct}% of goal)` : ""}`}
						</Text>
						<Text className="text-xs font-mono text-muted-foreground">
							{`P${avg.protein}g · C${avg.carbs}g · F${avg.fat}g`}
							{profile.protein_grams || profile.carbs_grams || profile.fat_grams
								? ` (targets: P${profile.protein_grams ?? "—"}g · C${profile.carbs_grams ?? "—"}g · F${profile.fat_grams ?? "—"}g)`
								: ""}
						</Text>
					</View>
				);
			})}
		</View>
	);
}

function PatchStack({ patches }: { patches: PrefPatchOp[] }) {
	if (patches.length === 0) {
		return (
			<Text className="text-xs text-muted-foreground italic">
				No active patches
			</Text>
		);
	}
	return (
		<View>
			{patches.map((p, i) => (
				<View
					key={i}
					className="bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 mb-1"
				>
					<Text className="text-xs font-mono text-blue-400">
						{p.action} · scope:{" "}
						{p.scope === null ? "global" : JSON.stringify(p.scope)}
					</Text>
					<Text
						className="text-xs text-muted-foreground font-mono"
						numberOfLines={2}
					>
						{JSON.stringify(p.payload)}
					</Text>
				</View>
			))}
		</View>
	);
}

function CompiledPreferencesGrid({
	draft,
}: {
	draft: Omit<MealPlanDraft, "undo_stack">;
}) {
	const compiled = compilePreferences(draft);
	const slotKeys = Object.keys(compiled) as SlotKey[];
	const dates = useMemo(
		() => [...new Set(Object.values(draft.slots).map((s) => s.date))].sort(),
		[draft.slots],
	);

	if (slotKeys.length === 0) {
		return (
			<Text className="text-xs text-muted-foreground italic">
				No slots to compile
			</Text>
		);
	}

	return (
		<View>
			{dates.map((date) => (
				<View key={date} className="mb-3">
					<Text className="text-xs font-semibold text-muted-foreground mb-1">
						{date}
					</Text>
					{MEAL_TYPES.map((meal_type) => {
						const key: SlotKey = `${date}.${meal_type}`;
						const prefs = compiled[key];
						if (!prefs) return null;

						const hasFilters = prefs.hard_filters.length > 0;
						const nonDefaultWeights = Object.entries(prefs.weights).filter(
							([, v]) => v !== 1.0,
						);

						return (
							<View key={key} className="mb-1.5 pl-2 border-l-2 border-border">
								<Text className="text-xs text-muted-foreground font-medium mb-0.5">
									{meal_type}
								</Text>

								{prefs.assigned_recipe_id && (
									<Text className="text-xs text-green-400 font-mono">
										📌 assigned: {prefs.assigned_recipe_id}
									</Text>
								)}

								{hasFilters ? (
									<View className="flex-row flex-wrap gap-1 mb-0.5">
										{prefs.hard_filters.map((f, i) => (
											<View
												key={i}
												className="bg-red-500/15 border border-red-500/30 rounded px-1.5 py-0.5"
											>
												<Text className="text-xs font-mono text-red-400">
													{f.type}:{" "}
													{Array.isArray(f.value)
														? f.value.join(", ")
														: String(f.value)}
													{f.unit ? ` ${f.unit}` : ""}
												</Text>
											</View>
										))}
									</View>
								) : (
									<Text className="text-xs text-muted-foreground italic">
										no filters
									</Text>
								)}

								{nonDefaultWeights.length > 0 && (
									<View className="flex-row flex-wrap gap-1 mt-0.5">
										{nonDefaultWeights.map(([signal, value]) => (
											<View
												key={signal}
												className="bg-purple-500/15 border border-purple-500/30 rounded px-1.5 py-0.5"
											>
												<Text className="text-xs font-mono text-purple-400">
													{signal}: {value.toFixed(2)}
												</Text>
											</View>
										))}
									</View>
								)}
							</View>
						);
					})}
				</View>
			))}
		</View>
	);
}

// ==========================================
// Apply operations to draft (client-side execution)
// ==========================================

interface ApplyResult {
	draft: Omit<MealPlanDraft, "undo_stack">;
	regenerateOps: RegenerateSlotsOp[];
	slotAssignments: SlotAssignment[];
}

function applyOperationsToDraft(
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
					// Clear all unlocked entries across all slots
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
				// Exchange entries between two slots. `target` and `to` must each be a
				// single SlotTarget (or the first element of an array).
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
				// Copy entries from `target` to `to`, then clear the source.
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
				// Duplicate entries from `target` into `to` (source is unchanged).
				// When `to` is an array, copy into each destination.
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
							draft_entry_id: Crypto.randomUUID(),
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
				// Queue a targeted regenerate so the generator fills this slot,
				// and collect the recipe_id so it reaches the compiler as an
				// assigned_recipe_id override.
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
				// Add a new meal-type row to every date currently in the draft.
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
				// Remove slots from the draft. If `meal_type` is provided, remove that
				// meal-type row from every date. If `target` is provided, remove those
				// specific slots.
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

// ==========================================
// Main screen
// ==========================================

export default function InterpreterTestHarness() {
	// ---- Day selection (default: current Mon–Sun) -------------------------
	const [selectedDayIndices, setSelectedDayIndices] = useState<Set<number>>(
		() => new Set([0, 1, 2, 3, 4, 5, 6]),
	);

	const selectedDates = useMemo(
		() =>
			[...selectedDayIndices].sort((a, b) => a - b).map((i) => isoWeekDate(i)),
		[selectedDayIndices],
	);

	function toggleDay(i: number) {
		setSelectedDayIndices((prev) => {
			const next = new Set(prev);
			if (next.has(i)) {
				if (next.size === 1) return prev; // always keep at least 1
				next.delete(i);
			} else {
				next.add(i);
			}
			return next;
		});
	}

	// ---- Profile selection ------------------------------------------------
	const { profiles, isLoading: isLoadingProfiles } = useProfiles();
	const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
		() => new Set(),
	);

	// Auto-select all profiles on first load
	const [autoSelected, setAutoSelected] = useState(false);
	useEffect(() => {
		if (!autoSelected && profiles.length > 0) {
			setSelectedProfileIds(new Set(profiles.map((p) => p.id)));
			setAutoSelected(true);
		}
	}, [autoSelected, profiles]);

	function toggleProfile(id: string) {
		setSelectedProfileIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				if (next.size === 1) return prev; // always keep at least 1
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	// ---- Draft -----------------------------------------------------------
	type DraftState = Omit<MealPlanDraft, "undo_stack">;
	const [draft, setDraft] = useState<DraftState>(() =>
		buildEmptyDraft(selectedDates, [...selectedProfileIds]),
	);

	// Keep included_profile_ids in sync whenever the profile selection changes.
	// Does NOT reset slots — only updates the profile list on the existing draft.
	useEffect(() => {
		const ids = [...selectedProfileIds];
		if (ids.length === 0) return;
		setDraft((prev) => ({ ...prev, included_profile_ids: ids }));
	}, [selectedProfileIds]);

	const [turns, setTurns] = useState<TurnMessage[]>([]);
	const [input, setInput] = useState("");
	const { interpret, isPending: isInterpreting } =
		useInterpretMealPlanMessage();
	const { generateSlots, isPending: isGenerating } = useGenerateSlots();

	const isPending = isInterpreting || isGenerating;

	/**
	 * Dispatches all `regenerate_slots` ops from a turn to the generator endpoint,
	 * merges the returned slots back into the draft, then returns the updated draft.
	 * Merges ops sequentially so each op sees the slots updated by the previous one.
	 */
	const applyRegenerateOps = async (
		currentDraft: Omit<MealPlanDraft, "undo_stack">,
		ops: RegenerateSlotsOp[],
		slotAssignments: SlotAssignment[],
	): Promise<Omit<MealPlanDraft, "undo_stack">> => {
		let latest = currentDraft;
		for (const op of ops) {
			const targetSlots =
				op.target === null ? undefined : (op.target as SlotTarget[]);

			// Only forward assignments relevant to this op's target slots
			const relevantAssignments =
				targetSlots === undefined
					? slotAssignments
					: slotAssignments.filter((a) =>
							targetSlots.some(
								(t) => t.date === a.date && t.meal_type === a.meal_type,
							),
						);

			const result = await generateSlots({
				// Cast required: SlotKey template literal type is narrower than
				// the Zod-inferred Record<string, ...> that the request schema expects.
				draft: latest as unknown as Parameters<
					typeof generateSlots
				>[0]["draft"],
				target_slots: targetSlots,
				slot_assignments:
					relevantAssignments.length > 0 ? relevantAssignments : undefined,
			});

			if (result && "updated_slots" in result && result.updated_slots) {
				latest = {
					...latest,
					slots: result.updated_slots as typeof latest.slots,
				};
			}
		}
		return latest;
	};

	/** Full initial generation — regenerates all unlocked slots. */
	const handleGenerateAll = async () => {
		if (isPending) return;
		try {
			const result = await generateSlots({
				draft: draft as unknown as Parameters<typeof generateSlots>[0]["draft"],
			});
			if (result && "updated_slots" in result && result.updated_slots) {
				setDraft((prev) => ({
					...prev,
					slots: result.updated_slots as typeof prev.slots,
				}));
			}
		} catch (e) {
			setTurns((prev) => [
				...prev,
				{
					id: Crypto.randomUUID(),
					role: "assistant",
					text: `Generator error: ${e instanceof Error ? e.message : "Unknown error"}`,
				},
			]);
		}
	};

	const handleSend = async () => {
		const trimmed = input.trim();
		if (!trimmed || isPending) return;

		const userTurn: TurnMessage = {
			id: Crypto.randomUUID(),
			role: "user",
			text: trimmed,
		};

		setTurns((prev) => [...prev, userTurn]);
		setInput("");

		try {
			const response = await interpret({
				user_message: trimmed,
				draft,
				profiles: profiles?.map((p) => ({ id: p.id, name: p.name })),
				conversation_history: turns.map((t) => ({
					role: t.role,
					content: t.text,
				})),
			});

			const {
				draft: draftAfterEdits,
				regenerateOps,
				slotAssignments,
			} = applyOperationsToDraft(
				draft,
				response.operations as InterpreterOperation[],
			);

			// Apply regenerate_slots ops sequentially through the generator
			const finalDraft = await applyRegenerateOps(
				draftAfterEdits,
				regenerateOps,
				slotAssignments,
			);

			const assistantTurn: TurnMessage = {
				id: Crypto.randomUUID(),
				role: "assistant",
				text: response.interpretation_summary,
				response,
			};

			setTurns((prev) => [...prev, assistantTurn]);
			setDraft(finalDraft);
		} catch (e) {
			setTurns((prev) => [
				...prev,
				{
					id: Crypto.randomUUID(),
					role: "assistant",
					text: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
				},
			]);
		}
	};

	/** Rebuild the draft whenever days or profiles change. Clears all slots. */
	const handleReset = () => {
		setDraft(buildEmptyDraft(selectedDates, [...selectedProfileIds]));
		setTurns([]);
		setInput("");
	};

	return (
		<SafeAreaView className="flex-1 bg-background">
			{/* Header */}
			<View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
				<View>
					<Text className="font-semibold text-base">Interpreter Harness</Text>
					<Text className="text-xs text-muted-foreground">
						{draft.preference_patch_stack.length} active patch
						{draft.preference_patch_stack.length !== 1 ? "es" : ""}
					</Text>
				</View>
				<View className="flex-row gap-2">
					<TouchableOpacity
						onPress={handleGenerateAll}
						disabled={isPending}
						className={`px-3 py-1.5 rounded ${isPending ? "bg-primary/30" : "bg-primary/20"}`}
					>
						{isGenerating ? (
							<ActivityIndicator size="small" />
						) : (
							<Text className="text-xs text-primary font-medium">
								Generate All
							</Text>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						onPress={handleReset}
						className="px-3 py-1.5 bg-destructive/20 rounded"
					>
						<Text className="text-xs text-destructive font-medium">Reset</Text>
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ padding: 16 }}
				keyboardShouldPersistTaps="handled"
			>
				{/* ── Day picker ── */}
				<View className="mb-4 p-3 bg-card border border-border rounded-lg">
					<Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
						Days to Plan
					</Text>
					<View className="flex-row gap-1.5 flex-wrap">
						{DAY_LABELS.map((label, i) => {
							const selected = selectedDayIndices.has(i);
							return (
								<TouchableOpacity
									key={label}
									onPress={() => toggleDay(i)}
									className={`px-2.5 py-1 rounded-full border ${selected ? "bg-primary border-primary" : "bg-muted border-border"}`}
								>
									<Text
										className={`text-xs font-medium ${selected ? "text-primary-foreground" : "text-muted-foreground"}`}
									>
										{label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
					<Text className="text-xs text-muted-foreground mt-1.5">
						{selectedDates.join("  ·  ")}
					</Text>
				</View>

				{/* ── Profile picker ── */}
				<View className="mb-4 p-3 bg-card border border-border rounded-lg">
					<Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
						Profiles
					</Text>
					{isLoadingProfiles ? (
						<ActivityIndicator size="small" />
					) : profiles.length === 0 ? (
						<Text className="text-xs text-muted-foreground italic">
							No profiles found
						</Text>
					) : (
						<View className="gap-2">
							{profiles.map((profile) => {
								const selected = selectedProfileIds.has(profile.id);
								return (
									<TouchableOpacity
										key={profile.id}
										onPress={() => toggleProfile(profile.id)}
										className={`flex-row items-center gap-2 p-2 rounded-lg border ${selected ? "bg-primary/10 border-primary/40" : "bg-muted border-border"}`}
									>
										<View
											className={`w-3 h-3 rounded-full border ${selected ? "bg-primary border-primary" : "border-muted-foreground"}`}
										/>
										<View className="flex-1">
											<Text
												className={`text-xs font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}
											>
												{profile.name}
												{profile.is_primary ? " ★" : ""}
											</Text>
											{(profile.daily_calorie_goal ||
												profile.protein_grams ||
												profile.carbs_grams ||
												profile.fat_grams) && (
												<Text className="text-xs font-mono text-muted-foreground">
													{[
														profile.daily_calorie_goal &&
															`${profile.daily_calorie_goal} kcal`,
														profile.protein_grams &&
															`P${profile.protein_grams}g`,
														profile.carbs_grams && `C${profile.carbs_grams}g`,
														profile.fat_grams && `F${profile.fat_grams}g`,
													]
														.filter(Boolean)
														.join(" · ")}
												</Text>
											)}
										</View>
									</TouchableOpacity>
								);
							})}
						</View>
					)}
				</View>

				{/* Draft state */}
				<View className="mb-4 p-3 bg-card border border-border rounded-lg">
					<Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
						Draft State
					</Text>
					<DraftGrid draft={draft} profiles={profiles} />
					<DraftMacroSummary draft={draft} profiles={profiles} />
				</View>

				{/* Patch stack */}
				<View className="mb-4 p-3 bg-card border border-border rounded-lg">
					<Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
						Preference Patch Stack
					</Text>
					<PatchStack patches={draft.preference_patch_stack} />
				</View>

				{/* Compiled preferences */}
				<View className="mb-4 p-3 bg-card border border-border rounded-lg">
					<Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
						Compiled Preferences
					</Text>
					<CompiledPreferencesGrid draft={draft} />
				</View>

				{/* Conversation */}
				{turns.length > 0 && (
					<View className="mb-4">
						<Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
							Turns
						</Text>
						{turns.map((turn) => (
							<View key={turn.id} className="mb-3">
								{turn.role === "user" ? (
									<View className="self-end max-w-[80%] bg-secondary px-3 py-2 rounded-xl rounded-tr-sm">
										<Text className="text-sm">{turn.text}</Text>
									</View>
								) : (
									<View className="max-w-full">
										{/* Summary bubble */}
										<View className="bg-primary/15 border border-primary/25 px-3 py-2 rounded-xl rounded-tl-sm mb-2">
											<Text className="text-sm">{turn.text}</Text>
											{turn.response?.is_ambiguous && (
												<Text className="text-xs text-amber-500 mt-1">
													⚠ Ambiguous — made a reasonable assumption
												</Text>
											)}
										</View>
										{/* Operations */}
										{turn.response && turn.response.operations.length > 0 ? (
											<View>
												<Text className="text-xs text-muted-foreground mb-1">
													{`${turn.response.operations.length} operation${turn.response.operations.length !== 1 ? "s" : ""} emitted:`}
												</Text>
												{turn.response.operations.map((op, i) => (
													<OpPill key={i} op={op as InterpreterOperation} />
												))}
											</View>
										) : turn.response ? (
											<Text className="text-xs text-muted-foreground italic">
												No operations emitted
											</Text>
										) : null}
									</View>
								)}
							</View>
						))}
					</View>
				)}

				{isPending && (
					<View className="flex-row items-center gap-2 mb-4">
						<ActivityIndicator size="small" />
						<Text className="text-sm text-muted-foreground">
							{isGenerating ? "Generating…" : "Interpreting…"}
						</Text>
					</View>
				)}
			</ScrollView>

			{/* Input */}
			<View className="border-t border-border px-4 py-3 flex-row items-end gap-2">
				<TextInput
					className="flex-1 bg-muted rounded-xl px-3 py-2 text-foreground text-sm min-h-[40px] max-h-[120px]"
					placeholder='Try: "No kale", "Lock all lunches", "Weekends should be fun"…'
					placeholderTextColor="#888"
					value={input}
					onChangeText={setInput}
					multiline
					editable={!isPending}
					returnKeyType="send"
					submitBehavior="blurAndSubmit"
					onSubmitEditing={handleSend}
				/>
				<TouchableOpacity
					onPress={handleSend}
					disabled={!input.trim() || isPending}
					className={`px-4 py-2 rounded-xl ${!input.trim() || isPending ? "bg-primary/40" : "bg-primary"}`}
				>
					<Text className="text-primary-foreground text-sm font-medium">
						Send
					</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}
