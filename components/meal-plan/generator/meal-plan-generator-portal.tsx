import * as Crypto from "expo-crypto";

import type {
	ActiveDraft,
	ExistingBehavior,
	GeneratorPhase,
	GeneratorSetup,
	RecipeSource,
} from "./types";
import type {
	DraftFoodEntry,
	DraftSlot,
	HardFilter,
	MealType,
	PrefPatchOp,
	SlotKey,
} from "@/lib/meal-plan-draft/types";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

import { ChatBar } from "./chat-panel";
import type { GeneratedMealPlan } from "@/lib/schemas/meal-plans/generate/chat-schema";
import type { GetFoodEntriesResponse } from "@/app/api/food-entries/index+api";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import type { PostChatRequest } from "@/app/api/meal-plans/generate/chat/index+api";
import { SetupWizard } from "./setup-wizard";
import { Text } from "@/components/ui/text";
import { X } from "@/lib/icons";
import { useClearMealPlan } from "@/hooks/meal-plans/use-clear-meal-plan";
import { useGenerateMealPlanChat } from "@/hooks/meal-plans/use-generate-meal-plan-chat";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveMealPlan } from "@/hooks/meal-plans/use-save-meal-plan";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FoodEntry = GetFoodEntriesResponse["foodEntries"][0];

function buildEmptyDraft(
	dates: string[],
	profileIds: string[],
	mealTypes: MealType[],
): ActiveDraft {
	const slots: Record<SlotKey, DraftSlot> = {};
	for (const date of dates) {
		for (const mealType of mealTypes) {
			const key: SlotKey = `${date}.${mealType}`;
			slots[key] = { date, meal_type: mealType, entries: [] };
		}
	}
	return {
		session_id: Crypto.randomUUID(),
		included_profile_ids: profileIds,
		slots,
		preference_patch_stack: [],
	};
}

function foodEntryToDraftEntry(entry: FoodEntry): DraftFoodEntry | null {
	if (!entry.recipe || !entry.recipe_id) return null;
	const macro = entry.recipe.macros?.[0];
	return {
		draft_entry_id: entry.id,
		recipe: {
			id: entry.recipe_id,
			image_id: entry.recipe.image_id,
			name: entry.recipe.name ?? "Unknown",
			calories_per_serving: macro?.calories ?? 0,
			macros_per_serving: {
				protein_g: macro?.protein ?? 0,
				carbs_g: macro?.carbohydrate ?? 0,
				fat_g: macro?.fat ?? 0,
			},
			servings: entry.recipe.number_of_servings ?? 1,
			core_ingredients: [],
		},
		locked: true,
		profile_food_entries: (entry.profile_food_entry ?? [])
			.filter((pfe) => pfe.number_of_servings > 0)
			.map((pfe) => ({
				profile_id: pfe.profile_id,
				number_of_servings: pfe.number_of_servings,
			})),
	};
}

function buildSourcePatches(sources: RecipeSource[]): PrefPatchOp[] {
	if (sources.includes("library") && sources.includes("catalog")) return [];
	return [
		{
			op: "pref_patch",
			action: "add_filter",
			scope: null,
			payload: {
				filter: {
					type: "source_restriction",
					value: sources[0],
				} as HardFilter,
			},
		},
	];
}

function draftToGeneratedMealPlan(draft: ActiveDraft): GeneratedMealPlan {
	const recipesMap = new Map<
		string,
		{ id: string; name: string; servings: number }
	>();
	const foodEntries: GeneratedMealPlan["foodEntries"] = [];

	for (const slot of Object.values(draft.slots)) {
		for (const entry of slot.entries) {
			if (!recipesMap.has(entry.recipe.id)) {
				recipesMap.set(entry.recipe.id, {
					id: entry.recipe.id,
					name: entry.recipe.name,
					servings: entry.recipe.servings,
				});
			}
			foodEntries.push({
				recipe_id: entry.recipe.id,
				date: slot.date,
				meal_type: slot.meal_type.toLowerCase() as
					| "breakfast"
					| "lunch"
					| "dinner"
					| "snack",
				profile_servings: entry.profile_food_entries.map((pfe) => [
					pfe.profile_id,
					pfe.number_of_servings,
				]),
			});
		}
	}

	return {
		recipes: Array.from(recipesMap.values()).map((r) => ({
			type: "saved" as const,
			id: r.id,
			name: r.name,
			servings: r.servings,
			ingredients: [],
			instructions: [],
		})),
		foodEntries,
		notes: [],
	};
}

function getDraftDateRange(draft: ActiveDraft): {
	startDate: Date;
	endDate: Date;
} {
	const dates = Object.values(draft.slots)
		.map((s) => parseISO(s.date))
		.sort((a, b) => a.getTime() - b.getTime());
	return { startDate: dates[0], endDate: dates[dates.length - 1] };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MealPlanGeneratorPortalProps {
	isOpen: boolean;
	onClose: () => void;
	weekDates: Date[];
	profiles: { id: string; name: string; avatarUrl?: string }[];
	foodEntriesByDay: { [key: string]: FoodEntry[] };
	/** Controlled draft — portal calls onDraftChange to update it */
	draft: ActiveDraft | null;
	onDraftChange: (draft: ActiveDraft | null) => void;
}

export function MealPlanGeneratorPortal({
	isOpen,
	onClose,
	weekDates,
	profiles,
	foodEntriesByDay,
	draft,
	onDraftChange,
}: MealPlanGeneratorPortalProps) {
	const { height: windowHeight } = useWindowDimensions();
	const SETUP_HEIGHT = Math.min(Math.round(windowHeight * 0.58), 480);

	const queryClient = useQueryClient();
	const { sendMessage, isPending } = useGenerateMealPlanChat();
	const { saveMealPlan, isPending: isSaving } = useSaveMealPlan();
	const { mutateAsync: clearMealPlan } = useClearMealPlan();

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	const [phase, setPhase] = useState<GeneratorPhase>("setup");
	const [currentStep, setCurrentStep] = useState(0);
	const [setup, setSetup] = useState<GeneratorSetup>(() => ({
		dateStrings: weekDates.map((d) => format(d, "yyyy-MM-dd")),
		profileIds: profiles.map((p) => p.id),
		mealTypes: ["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[],
		recipeSources: ["library", "catalog"] as RecipeSource[],
		existingBehavior: "keep" as ExistingBehavior,
	}));
	const [undoStack, setUndoStack] = useState<ActiveDraft[]>([]);
	const [input, setInput] = useState("");
	const [lastMessage, setLastMessage] = useState<string | undefined>(undefined);

	// Sync default profile IDs when profiles first load
	useEffect(() => {
		if (profiles.length > 0 && setup.profileIds.length === 0) {
			setSetup((prev) => ({ ...prev, profileIds: profiles.map((p) => p.id) }));
		}
	}, [profiles, setup.profileIds.length]);

	// ---------------------------------------------------------------------------
	// Handlers
	// ---------------------------------------------------------------------------

	/** Push old draft to undo stack then propagate the new draft up */
	const updateDraft = (newDraft: ActiveDraft) => {
		setUndoStack((prev) => (draft ? [...prev, draft] : prev));
		onDraftChange(newDraft);
	};

	const handleGenerate = async () => {
		setPhase("generating");

		const newDraft = buildEmptyDraft(
			setup.dateStrings,
			setup.profileIds,
			setup.mealTypes,
		);

		// Pre-populate locked entries when "keep" is selected
		if (setup.existingBehavior === "keep") {
			for (const dateString of setup.dateStrings) {
				const entries = foodEntriesByDay[dateString] ?? [];
				for (const entry of entries) {
					if (!setup.mealTypes.includes(entry.meal_type as MealType)) continue;
					const draftEntry = foodEntryToDraftEntry(entry);
					if (!draftEntry) continue;
					const key: SlotKey = `${dateString}.${entry.meal_type}`;
					if (newDraft.slots[key]) {
						newDraft.slots[key].entries.push(draftEntry);
					}
				}
			}
		}

		const sourcePatches = buildSourcePatches(setup.recipeSources);
		if (sourcePatches.length > 0) {
			newDraft.preference_patch_stack.push(...sourcePatches);
		}

		try {
			const result = await sendMessage({
				draft: newDraft as unknown as PostChatRequest["draft"],
				generate_all: true,
			});

			if ("updated_slots" in result) {
				const updatedDraft: ActiveDraft = {
					...newDraft,
					slots: result.updated_slots as ActiveDraft["slots"],
					preference_patch_stack:
						result.preference_patch_stack as unknown as PrefPatchOp[],
				};
				onDraftChange(updatedDraft);
				setPhase("chat");
			}
		} catch {
			setPhase("setup");
		}
	};

	const handleSend = async () => {
		const trimmed = input.trim();
		if (!trimmed || isPending || !draft) return;
		setInput("");

		try {
			const response = await sendMessage({
				user_message: trimmed,
				draft: draft as unknown as PostChatRequest["draft"],
				profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
			});

			if ("updated_slots" in response) {
				const updatedDraft: ActiveDraft = {
					...draft,
					slots: response.updated_slots as ActiveDraft["slots"],
					preference_patch_stack:
						response.preference_patch_stack as unknown as PrefPatchOp[],
				};
				updateDraft(updatedDraft);
				if (response.interpretation_summary) {
					setLastMessage(response.interpretation_summary);
				}
			}
		} catch {
			// silent — draft stays unchanged
		}
	};

	const handleShuffle = async () => {
		if (!draft || isPending) return;
		try {
			const result = await sendMessage({
				draft: draft as unknown as PostChatRequest["draft"],
				generate_all: true,
			});
			if ("updated_slots" in result) {
				const updatedDraft: ActiveDraft = {
					...draft,
					slots: result.updated_slots as ActiveDraft["slots"],
					preference_patch_stack:
						result.preference_patch_stack as unknown as PrefPatchOp[],
				};
				updateDraft(updatedDraft);
			}
		} catch {
			// silent
		}
	};

	const handleUndo = () => {
		if (undoStack.length === 0) return;
		const prev = undoStack[undoStack.length - 1];
		setUndoStack(undoStack.slice(0, -1));
		onDraftChange(prev);
	};

	const handleKeep = async () => {
		if (!draft) return;
		try {
			const { startDate, endDate } = getDraftDateRange(draft);
			await clearMealPlan({ startDate, endDate });
			await saveMealPlan({
				generatedMealPlan: draftToGeneratedMealPlan(draft),
			});
			queryClient.invalidateQueries({ queryKey: ["foodEntries"] });
			handleClose();
		} catch {
			// error handled silently; user can retry
		}
	};

	const handleDiscard = () => {
		handleClose();
	};

	const handleClose = () => {
		onDraftChange(null);
		setUndoStack([]);
		setPhase("setup");
		setCurrentStep(0);
		setInput("");
		setLastMessage(undefined);
		onClose();
	};

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	if (!isOpen) return null;

	return (
		<View
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				bottom: 0,
				zIndex: 50,
			}}
			className="items-center"
		>
			<View className="w-full max-w-3xl">
				{/* ── Setup / Generating panel ─────────────────────────── */}
				{(phase === "setup" || phase === "generating") && (
					<View
						className="m-2 bg-card border-t border-x border-border rounded-2xl shadow-lg overflow-hidden"
						style={{ maxHeight: SETUP_HEIGHT }}
					>
						<View className="flex-row items-center justify-between px-4 py-2 border-b border-border">
							<Text className="text-base font-semibold text-foreground">
								{phase === "generating"
									? "Generating\u2026"
									: "Generate Meal Plan"}
							</Text>
							<Pressable
								onPress={handleClose}
								hitSlop={8}
								className="p-1"
								disabled={phase === "generating"}
							>
								<X size={18} className="text-muted-foreground" />
							</Pressable>
						</View>

						{phase === "generating" ? (
							<View className="items-center justify-center py-10">
								<LoadingIndicator />
								<Text className="text-sm text-muted-foreground mt-3">
									Building your meal plan
								</Text>
							</View>
						) : (
							<ScrollView
								className="flex-1"
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
							>
								<View className="px-4 pt-3 pb-6">
									<SetupWizard
										weekDates={weekDates}
										profiles={profiles}
										setup={setup}
										onSetupChange={setSetup}
										onGenerate={handleGenerate}
										isGenerating={false}
										currentStep={currentStep}
										onStepChange={setCurrentStep}
									/>
								</View>
							</ScrollView>
						)}
					</View>
				)}

				{/* ── Chat bar ─────────────────────────────────────────── */}
				{phase === "chat" && (
					<ChatBar
						lastMessage={lastMessage}
						input={input}
						onInputChange={setInput}
						onSend={handleSend}
						onShuffle={handleShuffle}
						onKeep={handleKeep}
						onDiscard={handleDiscard}
						onUndo={handleUndo}
						canUndo={undoStack.length > 0}
						isPending={isPending}
						isSaving={isSaving}
					/>
				)}
			</View>
		</View>
	);
}
