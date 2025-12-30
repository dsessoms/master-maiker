import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	MoreHorizontalIcon,
	ShoppingCart,
	Trash2Icon,
	WandSparkles,
} from "@/lib/icons";
import { Stack, useRouter } from "expo-router";
import { eachDayOfInterval, format } from "date-fns";
import { useContext, useEffect, useMemo, useState } from "react";

import { AddShoppingItemsData } from "@/components/shopping/add-shopping-items-modal/types";
import { AddShoppingItemsModal } from "@/components/shopping/add-shopping-items-modal";
import { Button } from "@/components/ui/button";
import { DaySection } from "@/components//meal-plan/day-section";
import { DnDScrollView } from "@/components/ui/dnd/dnd-scroll-view";
import { GenerateMealPlanModal } from "@/components/meal-plan/generate-meal-plan-modal";
import { MealPlanContext } from "@/context/meal-plan-context";
import { NotesModal } from "@/components/meal-plan/notes-modal";
import { ProfileDropdown } from "@/components//user-dropdown";
import { SafeAreaView } from "@/components//safe-area-view";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { WeekSelector } from "@/components//week-selector";
import { useClearMealPlan } from "@/hooks/meal-plans/use-clear-meal-plan";

export default function MealPlanScreen() {
	const router = useRouter();
	const {
		startDate,
		endDate,
		viewThisWeek,
		viewNext,
		viewPrevious,
		selectableProfiles,
		onProfileToggle,
		foodEntriesByDay,
		notesModalState,
		closeNotesModal,
		generateMealPlanModalOpen,
		openGenerateMealPlanModal,
	} = useContext(MealPlanContext);

	const { mutateAsync: clearMealPlan, isPending: isClearingMealPlan } =
		useClearMealPlan();

	const [showClearDialog, setShowClearDialog] = useState(false);
	const [showAddToShoppingListModal, setShowAddToShoppingListModal] =
		useState(false);

	const weekDates = useMemo(
		() =>
			eachDayOfInterval({
				start: startDate,
				end: endDate,
			}),
		[startDate, endDate],
	);

	// Prepare data for shopping list modal - extract all recipe entries
	const shoppingItemsData: AddShoppingItemsData = useMemo(() => {
		const recipes: { recipeId: string; numberOfServings: number }[] = [];

		Object.values(foodEntriesByDay).forEach((entries) => {
			entries?.forEach((entry: any) => {
				if (entry.type?.toLowerCase() === "recipe" && entry.recipe_id) {
					recipes.push({
						recipeId: entry.recipe_id,
						numberOfServings: entry.number_of_servings || 1,
					});
				}
			});
		});

		return { recipes };
	}, [foodEntriesByDay]);

	const handleClearMealPlan = async () => {
		try {
			await clearMealPlan({ startDate, endDate });
			setShowClearDialog(false);
		} catch (error) {
			console.error("Failed to clear meal plan:", error);
			// Error is already logged, dialog will stay open
		}
	};

	return (
		<SafeAreaView
			className="flex flex-1 bg-background"
			edges={{ top: "additive", bottom: "off" }}
		>
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>
			<View className="flex flex-1 bg-muted-background">
				<View className="flex flex-row justify-between p-4 bg-background">
					<ProfileDropdown
						profiles={selectableProfiles}
						onProfileToggle={onProfileToggle}
					/>
					<WeekSelector
						startDate={startDate}
						endDate={endDate}
						onPreviousClick={viewPrevious}
						onNextClick={viewNext}
						onThisWeek={viewThisWeek}
					/>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreHorizontalIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem
								onPress={() => setShowAddToShoppingListModal(true)}
							>
								<ShoppingCart size={16} className="mr-2" />
								<Text>Add to Shopping List</Text>
							</DropdownMenuItem>
							<DropdownMenuItem onPress={() => setShowClearDialog(true)}>
								<Trash2Icon size={16} className="mr-2 text-destructive" />
								<Text className="text-destructive">Clear Meal Plan</Text>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</View>
				<DnDScrollView
					contentContainerStyle={{ padding: 16, flexGrow: 1 }}
					style={{ flex: 1 }}
				>
					{weekDates.map((date) => {
						const dateString = format(date, "yyyy-MM-dd");
						return (
							<DaySection
								key={dateString}
								date={date}
								recipeEntries={foodEntriesByDay[dateString]}
								onAdd={(mealType) =>
									router.push(
										`/(tabs)/(meal-plan)/meal-plan/add-recipe?mealType=${mealType}&date=${dateString}`,
									)
								}
							/>
						);
					})}
				</DnDScrollView>
			</View>
			{notesModalState && (
				<NotesModal
					isVisible={!!notesModalState}
					toggleIsVisible={closeNotesModal}
					date={notesModalState.date}
					mealType={notesModalState.mealType}
				/>
			)}
			{generateMealPlanModalOpen && (
				<GenerateMealPlanModal
					defaultStartDate={startDate}
					defaultEndDate={endDate}
				/>
			)}
			<AddShoppingItemsModal
				isOpen={showAddToShoppingListModal}
				onClose={() => setShowAddToShoppingListModal(false)}
				itemsToAdd={shoppingItemsData}
			/>
			<Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clear Meal Plan</DialogTitle>
						<DialogDescription>
							Are you sure you want to clear all meals and notes for this week?
							This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">
								<Text>Cancel</Text>
							</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onPress={handleClearMealPlan}
							disabled={isClearingMealPlan}
						>
							<Text>{isClearingMealPlan ? "Clearing..." : "Clear"}</Text>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<View className="absolute bottom-6 right-6">
				<Button
					variant="default"
					size="icon"
					className="w-12 h-12 rounded-full shadow-sm"
					onPress={openGenerateMealPlanModal}
				>
					<WandSparkles className="text-primary-foreground" size={24} />
				</Button>
			</View>
		</SafeAreaView>
	);
}
