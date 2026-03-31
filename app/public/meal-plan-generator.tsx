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
	DraftFoodEntry,
	DraftSlot,
	InterpreterOperation,
	MealPlanDraft,
	MealType,
	PrefPatchOp,
	SlotKey,
} from "@/lib/meal-plan-draft/types";

import type { InterpreterResponseFromSchema } from "@/lib/meal-plan-draft/interpreter-schema";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { compilePreferences } from "@/lib/meal-plan-draft";
import { useInterpretMealPlanMessage } from "@/hooks/meal-plans/use-interpret-meal-plan-message";
import { useState } from "react";

// ==========================================
// Seed data — a realistic 3-day draft
// ==========================================

const SEED_DATES = ["2026-04-06", "2026-04-07", "2026-04-08"] as const;
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

function makeEntry(recipeName: string, recipeId: string): DraftFoodEntry {
	return {
		draft_entry_id: Crypto.randomUUID(),
		locked: false,
		recipe: {
			id: recipeId,
			name: recipeName,
			calories_per_serving: 450,
			macros_per_serving: { protein_g: 35, carbs_g: 40, fat_g: 15 },
			yield: 4,
			core_ingredients: [],
		},
		profile_food_entries: [
			{ profile_id: "profile-dev", number_of_servings: 1 },
		],
	};
}

function buildSeedDraft(): Omit<MealPlanDraft, "undo_stack"> {
	const SEED_RECIPES: Record<string, [string, string]> = {
		"2026-04-06.Breakfast": ["Greek Yogurt Parfait", "recipe-001"],
		"2026-04-06.Lunch": ["Grilled Chicken Salad", "recipe-002"],
		"2026-04-06.Dinner": ["Beef Stir-fry with Rice", "recipe-003"],
		"2026-04-07.Breakfast": ["Oatmeal with Berries", "recipe-004"],
		"2026-04-07.Lunch": ["Turkey & Avocado Wrap", "recipe-005"],
		"2026-04-07.Dinner": ["Salmon with Roasted Vegetables", "recipe-006"],
		"2026-04-08.Breakfast": ["Scrambled Eggs & Toast", "recipe-007"],
		"2026-04-08.Lunch": ["Lentil Soup", "recipe-008"],
		"2026-04-08.Dinner": ["Pasta Primavera", "recipe-009"],
	};

	const slots: Record<SlotKey, DraftSlot> = {};
	for (const date of SEED_DATES) {
		for (const meal_type of MEAL_TYPES) {
			const key: SlotKey = `${date}.${meal_type}`;
			const recipeData = SEED_RECIPES[key];
			slots[key] = {
				date,
				meal_type,
				entries: recipeData ? [makeEntry(recipeData[0], recipeData[1])] : [],
			};
		}
	}

	return {
		session_id: Crypto.randomUUID(),
		included_profile_ids: ["profile-dev"],
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

function DraftGrid({ draft }: { draft: Omit<MealPlanDraft, "undo_stack"> }) {
	return (
		<View>
			{SEED_DATES.map((date) => (
				<View key={date} className="mb-2">
					<Text className="text-xs font-semibold text-muted-foreground mb-1">
						{date}
					</Text>
					{MEAL_TYPES.map((meal_type) => {
						const key: SlotKey = `${date}.${meal_type}`;
						const slot = draft.slots[key];
						const entry = slot?.entries[0];
						return (
							<View key={key} className="flex-row items-center mb-0.5 gap-2">
								<Text className="text-xs text-muted-foreground w-16">
									{meal_type}
								</Text>
								<View
									className={`flex-1 rounded px-2 py-0.5 ${entry?.locked ? "bg-amber-500/20 border border-amber-500/40" : "bg-muted"}`}
								>
									<Text className="text-xs" numberOfLines={1}>
										{entry
											? `${entry.locked ? "🔒 " : ""}${entry.recipe.name}`
											: "—"}
									</Text>
								</View>
							</View>
						);
					})}
				</View>
			))}
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

	if (slotKeys.length === 0) {
		return (
			<Text className="text-xs text-muted-foreground italic">
				No slots to compile
			</Text>
		);
	}

	return (
		<View>
			{SEED_DATES.map((date) => (
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

function applyOperationsToDraft(
	draft: Omit<MealPlanDraft, "undo_stack">,
	operations: InterpreterOperation[],
): Omit<MealPlanDraft, "undo_stack"> {
	let next = {
		...draft,
		slots: { ...draft.slots },
		preference_patch_stack: [...draft.preference_patch_stack],
	};

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
				if (target && target !== "all") {
					const targets = Array.isArray(target) ? target : [target];
					for (const t of targets) {
						const key: SlotKey = `${t.date}.${t.meal_type}`;
						if (newSlots[key]) {
							newSlots[key] = { ...newSlots[key], entries: [] };
						}
					}
					next.slots = newSlots;
				}
			}
			// Other plan_edit actions (swap, move, copy, assign, add_slot, remove_slot)
			// are shown in the operations log but not applied here — full execution
			// is the generator's responsibility in production.
		}
		// regenerate_slots: shown in ops log; generator not wired in test harness
	}

	return next;
}

// ==========================================
// Main screen
// ==========================================

export default function InterpreterTestHarness() {
	const [draft, setDraft] = useState(() => buildSeedDraft());
	const [turns, setTurns] = useState<TurnMessage[]>([]);
	const [input, setInput] = useState("");
	const { interpret, isPending } = useInterpretMealPlanMessage();

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
			});

			const assistantTurn: TurnMessage = {
				id: Crypto.randomUUID(),
				role: "assistant",
				text: response.interpretation_summary,
				response,
			};

			setTurns((prev) => [...prev, assistantTurn]);
			setDraft((prev) =>
				applyOperationsToDraft(
					prev,
					response.operations as InterpreterOperation[],
				),
			);
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

	const handleReset = () => {
		setDraft(buildSeedDraft());
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
				<TouchableOpacity
					onPress={handleReset}
					className="px-3 py-1.5 bg-destructive/20 rounded"
				>
					<Text className="text-xs text-destructive font-medium">Reset</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ padding: 16 }}
				keyboardShouldPersistTaps="handled"
			>
				{/* Draft state */}
				<View className="mb-4 p-3 bg-card border border-border rounded-lg">
					<Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
						Draft State
					</Text>
					<DraftGrid draft={draft} />
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
						<Text className="text-sm text-muted-foreground">Interpreting…</Text>
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
