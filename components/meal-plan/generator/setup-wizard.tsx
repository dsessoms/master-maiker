import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import type { ExistingBehavior, GeneratorSetup, RecipeSource } from "./types";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Check } from "@/lib/icons";
import type { MealType } from "@/lib/meal-plan-draft/types";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
	{ value: "Breakfast", label: "Breakfast" },
	{ value: "Lunch", label: "Lunch" },
	{ value: "Dinner", label: "Dinner" },
	{ value: "Snack", label: "Snack" },
];

type StepId = "days" | "meals" | "profiles" | "sources" | "behavior";
const STEP_IDS: StepId[] = ["days", "meals", "profiles", "sources", "behavior"];

const STEP_QUESTIONS: Record<StepId, string> = {
	days: "Which days should I plan?",
	meals: "Which meals should I plan?",
	profiles: "Who should I plan for?",
	sources: "Which recipe sources should I use?",
	behavior: "What should I do with existing entries?",
};

interface SetupWizardProps {
	weekDates: Date[];
	profiles: { id: string; name: string }[];
	setup: GeneratorSetup;
	onSetupChange: (setup: GeneratorSetup) => void;
	onGenerate: () => void;
	isGenerating: boolean;
	currentStep: number;
	onStepChange: (step: number) => void;
}

export function SetupWizard({
	weekDates,
	profiles,
	setup,
	onSetupChange,
	onGenerate,
	isGenerating,
	currentStep,
	onStepChange,
}: SetupWizardProps) {
	const scrollRef = useRef<ScrollView>(null);

	useEffect(() => {
		setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
	}, [currentStep]);

	const toggleDate = (dateString: string) => {
		const isSelected = setup.dateStrings.includes(dateString);
		if (isSelected && setup.dateStrings.length === 1) return;
		onSetupChange({
			...setup,
			dateStrings: isSelected
				? setup.dateStrings.filter((d) => d !== dateString)
				: [...setup.dateStrings, dateString],
		});
	};

	const toggleProfile = (id: string) => {
		const isSelected = setup.profileIds.includes(id);
		if (isSelected && setup.profileIds.length === 1) return;
		onSetupChange({
			...setup,
			profileIds: isSelected
				? setup.profileIds.filter((p) => p !== id)
				: [...setup.profileIds, id],
		});
	};

	const toggleMealType = (mealType: MealType) => {
		const isSelected = setup.mealTypes.includes(mealType);
		if (isSelected && setup.mealTypes.length === 1) return;
		onSetupChange({
			...setup,
			mealTypes: isSelected
				? setup.mealTypes.filter((m) => m !== mealType)
				: [...setup.mealTypes, mealType],
		});
	};

	const toggleSource = (source: RecipeSource) => {
		const isSelected = setup.recipeSources.includes(source);
		if (isSelected && setup.recipeSources.length === 1) return;
		onSetupChange({
			...setup,
			recipeSources: isSelected
				? setup.recipeSources.filter((s) => s !== source)
				: [...setup.recipeSources, source],
		});
	};

	const getSummary = (stepId: StepId): string => {
		switch (stepId) {
			case "days":
				return setup.dateStrings
					.map((d) => {
						const idx = weekDates.findIndex(
							(wd) => format(wd, "yyyy-MM-dd") === d,
						);
						return idx >= 0 ? DAY_LABELS[idx] : null;
					})
					.filter(Boolean)
					.join(", ");
			case "profiles":
				return (
					profiles
						.filter((p) => setup.profileIds.includes(p.id))
						.map((p) => p.name)
						.join(", ") || "None"
				);
			case "meals":
				return setup.mealTypes.join(", ");
			case "sources":
				return setup.recipeSources
					.map((s) => (s === "library" ? "My Library" : "Catalogue"))
					.join(", ");
			case "behavior":
				return setup.existingBehavior === "keep"
					? "Keep existing"
					: "Replace all";
		}
	};

	const canAdvance = (): boolean => {
		const step = STEP_IDS[currentStep];
		switch (step) {
			case "days":
				return setup.dateStrings.length > 0;
			case "meals":
				return setup.mealTypes.length > 0;
			case "profiles":
				return setup.profileIds.length > 0;
			case "sources":
				return setup.recipeSources.length > 0;
			case "behavior":
				return true;
		}
	};

	const isLastStep = currentStep === STEP_IDS.length - 1;

	return (
		<ScrollView
			ref={scrollRef}
			className="flex-1"
			showsVerticalScrollIndicator={false}
			keyboardShouldPersistTaps="handled"
		>
			<View className="gap-3 pb-2">
				{/* Answered steps */}
				{STEP_IDS.slice(0, currentStep).map((stepId, idx) => (
					<Pressable key={stepId} onPress={() => onStepChange(idx)}>
						<View className="px-3 py-2 rounded-xl bg-muted/50 flex-row items-center gap-2.5">
							<View className="w-5 h-5 rounded-full bg-primary/15 items-center justify-center flex-shrink-0">
								<Check size={11} className="text-primary" />
							</View>
							<Text
								className="text-xs text-muted-foreground flex-shrink-0"
								numberOfLines={1}
							>
								{STEP_QUESTIONS[stepId]}
							</Text>
							<Text
								className="text-xs font-semibold text-foreground flex-1 text-right"
								numberOfLines={1}
							>
								{getSummary(stepId)}
							</Text>
						</View>
					</Pressable>
				))}

				{/* Current step */}
				<View className="gap-3">
					<Text className="text-base font-semibold text-foreground">
						{STEP_QUESTIONS[STEP_IDS[currentStep]]}
					</Text>

					{/* Days options */}
					{STEP_IDS[currentStep] === "days" && (
						<View className="flex-row flex-wrap gap-2">
							{weekDates.map((date, idx) => {
								const dateString = format(date, "yyyy-MM-dd");
								const isSelected = setup.dateStrings.includes(dateString);
								return (
									<Pressable
										key={dateString}
										onPress={() => toggleDate(dateString)}
										className={cn(
											"px-3 py-1.5 rounded-full border",
											isSelected
												? "bg-primary border-primary"
												: "bg-background border-border",
										)}
									>
										<Text
											className={cn(
												"text-sm font-medium",
												isSelected
													? "text-primary-foreground"
													: "text-foreground",
											)}
										>
											{DAY_LABELS[idx]}
										</Text>
									</Pressable>
								);
							})}
						</View>
					)}
					{/* Meal type options */}
					{STEP_IDS[currentStep] === "meals" && (
						<View className="flex-row flex-wrap gap-2">
							{MEAL_TYPE_OPTIONS.map(({ value, label }) => {
								const isSelected = setup.mealTypes.includes(value);
								return (
									<Pressable
										key={value}
										onPress={() => toggleMealType(value)}
										className={cn(
											"px-3 py-1.5 rounded-full border",
											isSelected
												? "bg-primary border-primary"
												: "bg-background border-border",
										)}
									>
										<Text
											className={cn(
												"text-sm font-medium",
												isSelected
													? "text-primary-foreground"
													: "text-foreground",
											)}
										>
											{label}
										</Text>
									</Pressable>
								);
							})}
						</View>
					)}

					{/* Profile options */}
					{STEP_IDS[currentStep] === "profiles" && (
						<View className="flex-row flex-wrap gap-2">
							{profiles.map((profile) => {
								const isSelected = setup.profileIds.includes(profile.id);
								return (
									<Pressable
										key={profile.id}
										onPress={() => toggleProfile(profile.id)}
										className={cn(
											"px-3 py-1.5 rounded-full border",
											isSelected
												? "bg-primary border-primary"
												: "bg-background border-border",
										)}
									>
										<Text
											className={cn(
												"text-sm font-medium",
												isSelected
													? "text-primary-foreground"
													: "text-foreground",
											)}
										>
											{profile.name}
										</Text>
									</Pressable>
								);
							})}
						</View>
					)}

					{/* Source options */}
					{STEP_IDS[currentStep] === "sources" && (
						<View className="flex-row gap-2">
							{(
								[
									{ value: "library" as RecipeSource, label: "My Library" },
									{
										value: "catalog" as RecipeSource,
										label: "Recipe Catalogue",
									},
								] as const
							).map(({ value, label }) => {
								const isSelected = setup.recipeSources.includes(value);
								return (
									<Pressable
										key={value}
										onPress={() => toggleSource(value)}
										className={cn(
											"flex-1 px-3 py-2 rounded-xl border items-center",
											isSelected
												? "bg-primary border-primary"
												: "bg-background border-border",
										)}
									>
										<Text
											className={cn(
												"text-sm font-semibold",
												isSelected
													? "text-primary-foreground"
													: "text-foreground",
											)}
										>
											{label}
										</Text>
									</Pressable>
								);
							})}
						</View>
					)}

					{/* Behavior options */}
					{STEP_IDS[currentStep] === "behavior" && (
						<View className="flex-row gap-2">
							{(
								[
									{
										value: "keep" as ExistingBehavior,
										label: "Keep",
										desc: "Lock existing, fill empty slots",
									},
									{
										value: "replace" as ExistingBehavior,
										label: "Replace",
										desc: "Start fresh for selected days",
									},
								] as const
							).map(({ value, label, desc }) => {
								const isSelected = setup.existingBehavior === value;
								return (
									<Pressable
										key={value}
										onPress={() =>
											onSetupChange({ ...setup, existingBehavior: value })
										}
										className={cn(
											"flex-1 px-3 py-2.5 rounded-xl border",
											isSelected
												? "bg-primary border-primary"
												: "bg-background border-border",
										)}
									>
										<Text
											className={cn(
												"text-sm font-semibold",
												isSelected
													? "text-primary-foreground"
													: "text-foreground",
											)}
										>
											{label}
										</Text>
										<Text
											className={cn(
												"text-xs mt-0.5",
												isSelected
													? "text-primary-foreground/70"
													: "text-muted-foreground",
											)}
										>
											{desc}
										</Text>
									</Pressable>
								);
							})}
						</View>
					)}

					{/* Navigation buttons */}
					<View className="flex-row gap-2 mt-1">
						{currentStep > 0 && (
							<Button
								variant="outline"
								onPress={() => onStepChange(currentStep - 1)}
								disabled={isGenerating}
								className="flex-1"
							>
								<Text>← Back</Text>
							</Button>
						)}
						{isLastStep ? (
							<Button
								onPress={onGenerate}
								disabled={!canAdvance() || isGenerating}
								className="flex-1"
							>
								{isGenerating ? (
									<View className="flex-row items-center gap-2">
										<ActivityIndicator size="small" color="white" />
										<Text className="text-primary-foreground font-semibold">
											Generating…
										</Text>
									</View>
								) : (
									<Text className="text-primary-foreground font-semibold">
										Generate →
									</Text>
								)}
							</Button>
						) : (
							<Button
								onPress={() => onStepChange(currentStep + 1)}
								disabled={!canAdvance()}
								className="flex-1"
							>
								<Text className="text-primary-foreground font-semibold">
									Continue →
								</Text>
							</Button>
						)}
					</View>
				</View>
			</View>
		</ScrollView>
	);
}
