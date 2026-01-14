import * as Crypto from "expo-crypto";

import DateTimePicker, {
	DateType,
	useDefaultClassNames,
} from "react-native-ui-datepicker";
import { GeneratedMealPlan, MealPlanChatMessage } from "@/lib/schemas";
import { Modal, ScrollView, TouchableOpacity, View } from "react-native";
import React, {
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { differenceInDays, format, isBefore, startOfDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { CircleCheck } from "@/lib/icons/circle-check";
import { Input } from "@/components/ui/input";
import { MealPlanContext } from "@/context/meal-plan-context";
import { MealPlanPreview } from "@/components/meal-plan/meal-plan-preview";
import { Profile } from "@/types";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { X } from "@/lib/icons";
import { useGenerateMealPlanChat } from "@/hooks/meal-plans/use-generate-meal-plan-chat";
import { useRecipes } from "@/hooks/recipes/use-recipes";
import { useSaveMealPlan } from "@/hooks/meal-plans/use-save-meal-plan";

// Helper function to build basic information for the meal plan request
const buildBasicInformation = (
	startDate: Date,
	endDate: Date,
	profiles: Profile[],
	recipes: any[],
	additionalContext: string,
) => {
	return {
		startDate: format(startDate, "yyyy-MM-dd"),
		endDate: format(endDate, "yyyy-MM-dd"),
		userProfiles: profiles.map((profile) => ({
			id: profile.id,
			name: profile.name,
			dailyCalorieGoal: profile.daily_calorie_goal || undefined,
			dailyProteinGoal: profile.protein_grams || undefined,
			dailyCarbsGoal: profile.carbs_grams || undefined,
			dailyFatGoal: profile.fat_grams || undefined,
			likedFood: profile.liked_food || undefined,
			dislikedFood: profile.disliked_food || undefined,
		})),
		recipesToInclude: recipes.map((r) => {
			const macros = r.macros?.[0];
			return {
				id: r.id,
				name: r.name,
				calories: macros?.calories || undefined,
				carbohydrate: macros?.carbohydrate || undefined,
				protein: macros?.protein || undefined,
				fat: macros?.fat || undefined,
			};
		}),
		additionalContext: additionalContext || undefined,
	};
};

export interface ChatDisplayMessage {
	id: string;
	role: "assistant" | "user";
	content: string;
	introStep?: IntroStep;
	isHidden?: boolean;
	mealPlan?: GeneratedMealPlan;
}

enum IntroStep {
	DATE_RANGE = "DATE_RANGE",
	PROFILE_SELECTION = "PROFILE_SELECTION",
	RECIPE_SELECTION = "RECIPE_SELECTION",
	ADDITIONAL_CONTEXT = "ADDITIONAL_CONTEXT",
}

// Intro steps state
interface IntroStepsState {
	startDate: DateType;
	endDate: DateType;
	selectedProfileIds: Set<string>;
	selectedRecipeIds: Set<string>;
	additionalContext: string;
}

type IntroStepsAction =
	| { type: "SET_DATES"; startDate: DateType; endDate: DateType }
	| { type: "TOGGLE_PROFILE"; profileId: string }
	| { type: "TOGGLE_RECIPE"; recipeId: string }
	| { type: "SET_OPEN_ENDED_INPUT"; input: string }
	| { type: "RESET" };

const createInitialIntroStepsState = (
	defaultStartDate: Date,
	defaultEndDate: Date,
): IntroStepsState => {
	const start = startOfDay(defaultStartDate);
	const end = startOfDay(defaultEndDate);

	const today = startOfDay(new Date());

	return {
		startDate: isBefore(start, today) ? today : start,
		endDate: isBefore(end, today) ? today : end,
		selectedProfileIds: new Set(),
		selectedRecipeIds: new Set(),
		additionalContext: "",
	};
};

const introStepsReducer = (
	state: IntroStepsState,
	action: IntroStepsAction,
): IntroStepsState => {
	switch (action.type) {
		case "SET_DATES":
			return {
				...state,
				startDate: action.startDate,
				endDate: action.endDate,
			};
		case "TOGGLE_PROFILE": {
			const newSet = new Set(state.selectedProfileIds);
			if (newSet.has(action.profileId)) {
				newSet.delete(action.profileId);
			} else {
				newSet.add(action.profileId);
			}
			return {
				...state,
				selectedProfileIds: newSet,
			};
		}
		case "TOGGLE_RECIPE": {
			const newSet = new Set(state.selectedRecipeIds);
			if (newSet.has(action.recipeId)) {
				newSet.delete(action.recipeId);
			} else {
				newSet.add(action.recipeId);
			}
			return {
				...state,
				selectedRecipeIds: newSet,
			};
		}
		case "SET_OPEN_ENDED_INPUT":
			return {
				...state,
				additionalContext: action.input,
			};
		case "RESET":
			return createInitialIntroStepsState(
				state.startDate as Date,
				state.endDate as Date,
			);
		default:
			return state;
	}
};

// Profile card component for selection
const SelectableProfileCard = ({
	profile,
	isSelected,
	onToggle,
}: {
	profile: Profile;
	isSelected: boolean;
	onToggle: () => void;
}) => {
	return (
		<TouchableOpacity onPress={onToggle} className="mb-3" activeOpacity={0.7}>
			<View className="flex-row items-center p-4 bg-card border border-border rounded-lg">
				<View className="flex-1">
					<Text className="font-semibold">{profile.name}</Text>
				</View>
				<View className="ml-3">
					{isSelected && <CircleCheck size={24} className="text-primary" />}
					{!isSelected && (
						<View className="w-6 h-6 border-2 border-muted-foreground rounded-full" />
					)}
				</View>
			</View>
		</TouchableOpacity>
	);
};

// Simplified recipe card component for selection
const SelectableRecipeCard = ({
	recipe,
	isSelected,
	onToggle,
}: {
	recipe: any;
	isSelected: boolean;
	onToggle: () => void;
}) => {
	const checkboxOverlay = (
		<View className="absolute inset-0">
			{/* Translucent overlay */}
			{isSelected && <View className="absolute inset-0 bg-black/50" />}
			{/* Checkbox icon */}
			<View className="absolute top-3 right-3">
				{isSelected && <CircleCheck size={32} className="text-primary" />}
			</View>
		</View>
	);

	return (
		<View className="w-40 flex-shrink-0 mr-3">
			<RecipeCard
				recipe={recipe}
				onPress={onToggle}
				overlay={checkboxOverlay}
			/>
		</View>
	);
};

interface GenerateMealPlanModalProps {
	defaultStartDate: Date;
	defaultEndDate: Date;
}

export const GenerateMealPlanModal = ({
	defaultStartDate,
	defaultEndDate,
}: GenerateMealPlanModalProps) => {
	const {
		generateMealPlanModalOpen: isVisible,
		closeGenerateMealPlanModal: onClose,
		selectableProfiles,
	} = useContext(MealPlanContext);
	const { recipes } = useRecipes();
	const scrollViewRef = useRef<ScrollView>(null);
	const today = useMemo(() => new Date(), []);
	const defaultClassNames = useDefaultClassNames();
	const { sendMessage, isPending } = useGenerateMealPlanChat();
	const { saveMealPlan, isPending: isSaving } = useSaveMealPlan();

	// State for the collected data using reducer
	const [introStepsState, dispatch] = useReducer(
		introStepsReducer,
		createInitialIntroStepsState(defaultStartDate, defaultEndDate),
	);

	// Chat messages
	const [messages, setMessages] = useState<ChatDisplayMessage[]>([
		{
			id: Crypto.randomUUID(),
			role: "assistant",
			content:
				"Hi! Let's create a meal plan together. First, what date range would you like to plan for? You can plan as many as 7 days at a time!",
			introStep: IntroStep.DATE_RANGE,
		},
	]);

	const currentMessage = messages[messages.length - 1];

	// Chat input for critiquing meal plan
	const [chatInput, setChatInput] = useState("");

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		setTimeout(() => {
			if (scrollViewRef.current?.scrollToEnd) {
				scrollViewRef.current.scrollToEnd({ animated: true });
			}
		}, 100);
	}, [messages.length]);

	const addMessages = (messages: ChatDisplayMessage[]) => {
		setMessages((prev) => [...prev, ...messages]);
	};

	const saveDates = () => {
		const dateSelectionMessage = introStepsState.endDate
			? {
					id: Crypto.randomUUID(),
					role: "user" as const,
					content: `Create a meal plan for ${format(introStepsState.startDate as Date, "EEEE, MMMM dd")} to ${format(introStepsState.endDate as Date, "EEEE, MMMM dd")}`,
					introStep: IntroStep.DATE_RANGE,
				}
			: {
					id: Crypto.randomUUID(),
					role: "user" as const,
					content: `Create a meal plan for ${format(introStepsState.startDate as Date, "EEEE, MMMM dd")}`,
					introStep: IntroStep.DATE_RANGE,
				};

		addMessages([
			dateSelectionMessage,
			{
				id: Crypto.randomUUID(),
				role: "assistant",
				content: "Who will be eating these meals?",
				introStep: IntroStep.PROFILE_SELECTION,
			},
		]);
	};

	const toggleProfile = (profileId: string) => {
		dispatch({ type: "TOGGLE_PROFILE", profileId });
	};

	const saveProfiles = () => {
		const selectedProfiles = selectableProfiles.filter((p) =>
			introStepsState.selectedProfileIds.has(p.id),
		);
		const profileNames = selectedProfiles.map((p) => p.name).join(", ");

		addMessages([
			{
				id: Crypto.randomUUID(),
				role: "user",
				content: `Meal plan for: ${profileNames}`,
				introStep: IntroStep.PROFILE_SELECTION,
			},
			{
				id: Crypto.randomUUID(),
				role: "assistant",
				content: "Would you like to use any existing recipes?",
				introStep: IntroStep.RECIPE_SELECTION,
			},
		]);
	};

	const toggleRecipe = (recipeId: string) => {
		dispatch({ type: "TOGGLE_RECIPE", recipeId });
	};

	const saveRecipes = () => {
		const selectedRecipes = recipes?.filter((r) =>
			introStepsState.selectedRecipeIds.has(r.id),
		);

		let content = "";
		if (selectedRecipes && selectedRecipes.length > 0) {
			const recipeNames = selectedRecipes.map((r) => r.name).join(", ");
			content = `Use these recipes: ${recipeNames}`;
		} else {
			content = "Don't use any existing recipes";
		}

		addMessages([
			{
				id: Crypto.randomUUID(),
				role: "user",
				content,
				introStep: IntroStep.RECIPE_SELECTION,
			},
			{
				id: Crypto.randomUUID(),
				role: "assistant",
				content:
					"Great! Any other preferences or dietary restrictions I should know about?",
				introStep: IntroStep.ADDITIONAL_CONTEXT,
			},
		]);
	};

	const saveOpenEnded = async () => {
		const trimmedInput = introStepsState.additionalContext.trim();

		const selectedProfiles = selectableProfiles.filter((p) =>
			introStepsState.selectedProfileIds.has(p.id),
		);

		const selectedRecipes =
			recipes?.filter((r) => introStepsState.selectedRecipeIds.has(r.id)) || [];

		// Build basic information object
		const basicInformation = buildBasicInformation(
			introStepsState.startDate as Date,
			introStepsState.endDate as Date,
			selectedProfiles,
			selectedRecipes,
			trimmedInput,
		);

		const newMessages: ChatDisplayMessage[] = [
			{
				id: Crypto.randomUUID(),
				role: "user",
				content: trimmedInput || "No additional preferences",
				introStep: IntroStep.ADDITIONAL_CONTEXT,
			},
			{
				id: Crypto.randomUUID(),
				role: "assistant",
				content:
					"Perfect! I'll start generating your meal plan now. This may take a moment...",
			},
		];

		addMessages(newMessages);

		try {
			// Prepare messages for API - use the initial request message
			const initialMessage = trimmedInput || "Create a meal plan for me";
			const apiMessages: MealPlanChatMessage[] = [
				{
					role: "user",
					content: initialMessage,
				},
			];

			const response = await sendMessage({
				basicInformation,
				messages: apiMessages,
			});

			// Create assistant response message
			const assistantMessage: ChatDisplayMessage = {
				id: Crypto.randomUUID(),
				role: "assistant",
				content: response.content || "",
				mealPlan: response.mealPlan,
			};

			addMessages([assistantMessage]);

			// Handle the generated meal plan
			if (response.mealPlan) {
				console.log("Generated Meal Plan:", response.mealPlan);
			}
		} catch (error) {
			console.error("Error generating meal plan:", error);
			addMessages([
				{
					id: Crypto.randomUUID(),
					role: "assistant",
					content:
						"Sorry, I encountered an error generating your meal plan. Please try again.",
				},
			]);
		}
	};

	const handleSaveMealPlan = async () => {
		if (!currentMessage.mealPlan) return;

		try {
			const result = await saveMealPlan({
				generatedMealPlan: currentMessage.mealPlan,
			});

			console.log("Meal plan saved successfully:", result);

			// Add success message - check if result has success property
			if ("success" in result && result.success) {
				addMessages([
					{
						id: Crypto.randomUUID(),
						role: "assistant",
						content: `Great! Your meal plan has been saved successfully. Created ${result.recipesCreated} new recipe${result.recipesCreated !== 1 ? "s" : ""}, ${result.foodEntriesCreated} food entr${result.foodEntriesCreated !== 1 ? "ies" : "y"}, and ${result.notesCreated} note${result.notesCreated !== 1 ? "s" : ""}.`,
					},
				]);

				// Close modal after a short delay
				setTimeout(() => {
					onClose();
				}, 2000);
			}
		} catch (error) {
			console.error("Error saving meal plan:", error);
			addMessages([
				{
					id: Crypto.randomUUID(),
					role: "assistant",
					content:
						"Sorry, I encountered an error saving your meal plan. Please try again.",
				},
			]);
		}
	};

	const handleSendChatMessage = async () => {
		const trimmedInput = chatInput.trim();
		if (!trimmedInput || isPending) return;

		const selectedProfiles = selectableProfiles.filter((p) =>
			introStepsState.selectedProfileIds.has(p.id),
		);

		const selectedRecipes =
			recipes?.filter((r) => introStepsState.selectedRecipeIds.has(r.id)) || [];

		// Build basic information object
		const basicInformation = buildBasicInformation(
			introStepsState.startDate as Date,
			introStepsState.endDate as Date,
			selectedProfiles,
			selectedRecipes,
			introStepsState.additionalContext,
		);

		// Add user message to chat
		const userMessage: ChatDisplayMessage = {
			id: Crypto.randomUUID(),
			role: "user",
			content: trimmedInput,
		};

		addMessages([userMessage]);
		setChatInput("");

		try {
			// Build conversation history for API - only include non-intro messages
			const conversationHistory: MealPlanChatMessage[] = messages
				.filter((msg) => !msg.introStep)
				.map((msg) => ({
					role: msg.role,
					content: msg.content,
				}));

			// Add the new user message to history
			conversationHistory.push({
				role: "user",
				content: trimmedInput,
			});

			// Find the latest meal plan from messages
			const latestMealPlan = [...messages]
				.reverse()
				.find((msg) => msg.mealPlan)?.mealPlan;

			const response = await sendMessage({
				basicInformation,
				messages: conversationHistory,
				latestMealPlan,
			});

			// Create assistant response message
			const assistantMessage: ChatDisplayMessage = {
				id: Crypto.randomUUID(),
				role: "assistant",
				content: response.content || "",
				mealPlan: response.mealPlan,
			};

			addMessages([assistantMessage]);
		} catch (error) {
			console.error("Error sending chat message:", error);
			addMessages([
				{
					id: Crypto.randomUUID(),
					role: "assistant",
					content:
						"Sorry, I encountered an error processing your request. Please try again.",
				},
			]);
		}
	};

	return (
		<Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
			<View className="flex-1 bg-background mt-safe mb-safe">
				{/* Header */}
				<View className="flex-row items-center justify-between p-4 border-b border-border">
					<Text className="text-lg font-semibold">Generate Meal Plan</Text>
					<Button
						variant="ghost"
						size="icon"
						onPress={onClose}
						className="h-8 w-8"
					>
						<X className="text-foreground" size={20} />
					</Button>
				</View>

				{/* Chat Messages - Scrollable area */}
				<ScrollView
					ref={scrollViewRef}
					className="flex-1"
					contentContainerStyle={{
						padding: 16,
						paddingBottom: 8,
						flexGrow: 1,
					}}
					showsVerticalScrollIndicator={true}
					scrollEventThrottle={16}
					onLayout={() => {
						if (scrollViewRef.current?.scrollToEnd) {
							scrollViewRef.current.scrollToEnd({ animated: true });
						}
					}}
					keyboardShouldPersistTaps="handled"
					style={{ flex: 1 }}
				>
					{messages
						.filter((message) => !message.isHidden)
						.map((message, index) => (
							<View key={message.id} className="mb-3">
								<View
									className={`flex-row ${
										message.role === "user" ? "justify-end" : "justify-start"
									}`}
								>
									<View
										className={`max-w-[80%] p-3 rounded-lg ${
											message.role === "user" ? "bg-primary" : "bg-secondary"
										}`}
									>
										<Text
											className={`${
												message.role === "user"
													? "text-primary-foreground"
													: "text-foreground"
											}`}
										>
											{message.content}
										</Text>
									</View>
								</View>
							</View>
						))}
					{currentMessage.mealPlan && (
						<View className="mt-4">
							<MealPlanPreview
								startDate={introStepsState.startDate as string}
								endDate={introStepsState.endDate as string}
								mealPlan={currentMessage.mealPlan}
								profiles={selectableProfiles}
							/>
							<View className="flex-row gap-2 mt-4">
								<Button
									size="sm"
									onPress={handleSaveMealPlan}
									disabled={isPending || isSaving}
									className="flex-1"
								>
									<Text>{isSaving ? "Saving..." : "Save Meal Plan"}</Text>
								</Button>
							</View>
						</View>
					)}
					{/* Thinking indicator - Show when bot is processing */}
					{isPending && (
						<View className="mb-3">
							<View className="flex-row justify-start">
								<View className="max-w-[80%] p-3 rounded-lg bg-secondary">
									<Text className="text-foreground italic">thinking...</Text>
								</View>
							</View>
						</View>
					)}
				</ScrollView>

				{currentMessage.role === "assistant" &&
					currentMessage.introStep === IntroStep.DATE_RANGE && (
						<View className="border-t border-border bg-background p-2">
							<DateTimePicker
								classNames={{
									...defaultClassNames,
									today: "border-primary border",
									selected: "bg-primary",
									selected_label: "text-primary-foreground",
									range_start_label: "text-primary-foreground",
									range_end_label: "text-primary-foreground",
								}}
								mode="range"
								startDate={introStepsState.startDate}
								endDate={introStepsState.endDate}
								minDate={today}
								max={6}
								onChange={({ startDate, endDate }) => {
									dispatch({ type: "SET_DATES", startDate, endDate });
								}}
								navigationPosition="right"
							/>
							<Button onPress={saveDates} disabled={!introStepsState.startDate}>
								<Text>
									{(() => {
										if (!introStepsState.startDate) {
											return "Select dates";
										}
										const start = new Date(introStepsState.startDate as Date);
										const end = introStepsState.endDate
											? new Date(introStepsState.endDate as Date)
											: start;
										const diffDays = differenceInDays(end, start) + 1;
										return `Create ${diffDays} day plan`;
									})()}
								</Text>
							</Button>
						</View>
					)}

				{currentMessage.role === "assistant" &&
					currentMessage.introStep === IntroStep.PROFILE_SELECTION && (
						<View className="border-t border-border bg-background p-4">
							<View className="mb-4">
								{selectableProfiles.map((profile) => (
									<SelectableProfileCard
										key={profile.id}
										profile={profile}
										isSelected={introStepsState.selectedProfileIds.has(
											profile.id,
										)}
										onToggle={() => toggleProfile(profile.id)}
									/>
								))}
							</View>
							<Button
								onPress={saveProfiles}
								disabled={introStepsState.selectedProfileIds.size === 0}
							>
								<Text>Continue</Text>
							</Button>
						</View>
					)}

				{currentMessage.role === "assistant" &&
					currentMessage.introStep === IntroStep.RECIPE_SELECTION && (
						<View className="border-t border-border bg-background p-4">
							{recipes && recipes.length > 0 ? (
								<>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										className="mb-4"
										contentContainerStyle={{ paddingRight: 16 }}
									>
										{recipes.map((recipe) => (
											<SelectableRecipeCard
												key={recipe.id}
												recipe={recipe}
												isSelected={introStepsState.selectedRecipeIds.has(
													recipe.id,
												)}
												onToggle={() => toggleRecipe(recipe.id)}
											/>
										))}
									</ScrollView>
									<Button onPress={saveRecipes}>
										<Text>
											{introStepsState.selectedRecipeIds.size > 0
												? `Continue with ${introStepsState.selectedRecipeIds.size} recipe${introStepsState.selectedRecipeIds.size !== 1 ? "s" : ""}`
												: "Skip - No recipes"}
										</Text>
									</Button>
								</>
							) : (
								<>
									<Text className="text-muted-foreground text-center mb-4">
										No recipes found. You can create recipes later and add them
										to your meal plan.
									</Text>
									<Button onPress={saveRecipes}>
										<Text>Continue</Text>
									</Button>
								</>
							)}
						</View>
					)}

				{currentMessage.role === "assistant" &&
					currentMessage.introStep === IntroStep.ADDITIONAL_CONTEXT && (
						<View className="border-t border-border bg-background p-4">
							<Textarea
								placeholder="E.g., vegetarian, low-carb, no nuts, kid-friendly meals..."
								value={introStepsState.additionalContext}
								onChangeText={(text) =>
									dispatch({ type: "SET_OPEN_ENDED_INPUT", input: text })
								}
								className="mb-4"
								numberOfLines={4}
							/>
							<Button onPress={saveOpenEnded}>
								<Text>Generate Meal Plan</Text>
							</Button>
						</View>
					)}

				{/* Chat input for critiquing meal plan - only show after initial meal plan generation */}
				{!currentMessage.introStep && currentMessage.role === "assistant" && (
					<View className="border-t border-border bg-background p-4">
						<View className="flex-row items-end gap-2">
							<View className="flex-1">
								<Input
									placeholder="Ask for changes to the meal plan..."
									value={chatInput}
									onChangeText={setChatInput}
									multiline
									maxLength={500}
									editable={!isPending && !isSaving}
									placeholderTextColor="#888"
								/>
							</View>
							<Button
								size="icon"
								onPress={handleSendChatMessage}
								disabled={!chatInput.trim() || isPending || isSaving}
							>
								<Text className="text-lg">➤</Text>
							</Button>
						</View>
					</View>
				)}
			</View>
		</Modal>
	);
};
