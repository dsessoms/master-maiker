import type {
	ActiveDraft,
	ExistingBehavior,
	GeneratorPhase,
	GeneratorSetup,
	RecipeSource,
} from "./types";
import { Pressable, View, useWindowDimensions } from "react-native";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

import { ChatBar } from "./chat-panel";
import type { GeneratedMealPlan } from "@/lib/schemas/meal-plans/generate/chat-schema";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import type { MealType } from "@/lib/schemas/meal-plans/generate/draft-schema";
import { SetupWizard } from "./setup-wizard";
import { Text } from "@/components/ui/text";
import { X } from "@/lib/icons";
import { useClearMealPlan } from "@/hooks/meal-plans/use-clear-meal-plan";
import { useGenerateMealPlanChat } from "@/hooks/meal-plans/use-generate-meal-plan-chat";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveMealPlan } from "@/hooks/meal-plans/use-save-meal-plan";
import { useUndoRedo } from "./use-undo-redo";

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
	/** Controlled draft — portal calls onDraftChange to update it */
	draft: ActiveDraft | null;
	onDraftChange: (draft: ActiveDraft | null) => void;
	/** Called with the portal's measured height so the parent can add matching bottom padding */
	onHeightChange?: (height: number) => void;
}

export function MealPlanGeneratorPortal({
	isOpen,
	onClose,
	weekDates,
	profiles,
	draft,
	onDraftChange,
	onHeightChange,
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
		variety: "medium",
	}));
	const history = useUndoRedo<{
		draft: ActiveDraft;
		message: string | undefined;
	}>();
	const [input, setInput] = useState("");
	const [lastMessage, setLastMessage] = useState<string | undefined>(undefined);
	const [conversationHistory, setConversationHistory] = useState<
		{ role: "user" | "assistant"; content: string }[]
	>([]);

	// Sync default profile IDs when profiles first load
	useEffect(() => {
		if (profiles.length > 0 && setup.profileIds.length === 0) {
			setSetup((prev) => ({ ...prev, profileIds: profiles.map((p) => p.id) }));
		}
	}, [profiles, setup.profileIds.length]);

	// ---------------------------------------------------------------------------
	// Handlers
	// ---------------------------------------------------------------------------

	/** Push old draft+message to undo stack then propagate the new draft up */
	const updateDraft = (newDraft: ActiveDraft, newMessage?: string) => {
		if (draft) history.push({ draft, message: lastMessage });
		onDraftChange(newDraft);
		setLastMessage(newMessage);
	};

	const handleGenerate = async () => {
		setPhase("generating");

		try {
			const result = await sendMessage({ setup });

			if ("updated_slots" in result && "session_id" in result) {
				const updatedDraft: ActiveDraft = {
					session_id: result.session_id,
					included_profile_ids: setup.profileIds,
					slots: result.updated_slots as ActiveDraft["slots"],
					preference_patch_stack: result.preference_patch_stack,
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
				draft: draft,
				profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
				conversation_history: conversationHistory,
			});

			if ("updated_slots" in response && "session_id" in response) {
				const updatedDraft: ActiveDraft = {
					...draft,
					slots: response.updated_slots as ActiveDraft["slots"],
					preference_patch_stack: response.preference_patch_stack,
				};
				updateDraft(updatedDraft, response.interpretation_summary);
				setConversationHistory((prev) => [
					...prev,
					{ role: "user", content: trimmed },
					{ role: "assistant", content: response.interpretation_summary },
				]);
			}
		} catch {
			// silent — draft stays unchanged
		}
	};

	const handleShuffle = async () => {
		if (!draft || isPending) return;
		try {
			const result = await sendMessage({
				draft: draft,
			});
			if ("updated_slots" in result && "session_id" in result) {
				const updatedDraft: ActiveDraft = {
					...draft,
					slots: result.updated_slots as ActiveDraft["slots"],
					preference_patch_stack: result.preference_patch_stack,
				};
				updateDraft(updatedDraft);
			}
		} catch {
			// silent
		}
	};

	const handleUndo = () => {
		if (!draft) return;
		const prev = history.undo({ draft, message: lastMessage });
		if (prev) {
			onDraftChange(prev.draft);
			setLastMessage(prev.message);
		}
	};

	const handleRedo = () => {
		if (!draft) return;
		const next = history.redo({ draft, message: lastMessage });
		if (next) {
			onDraftChange(next.draft);
			setLastMessage(next.message);
		}
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
		history.clear();
		setPhase("setup");
		setCurrentStep(0);
		setInput("");
		setLastMessage(undefined);
		setConversationHistory([]);
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
			onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
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
								{phase === "generating" ? "Generating" : "Generate Meal Plan"}
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
							<View className="flex-1 px-4 pt-3 pb-4">
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
						canUndo={history.canUndo}
						onRedo={handleRedo}
						canRedo={history.canRedo}
						isPending={isPending}
						isSaving={isSaving}
					/>
				)}
			</View>
		</View>
	);
}
