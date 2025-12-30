import {
	Apple,
	Egg,
	Hamburger,
	NotebookText,
	Plus,
	Salad,
} from "../../lib/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useCallback, useContext, useMemo, useState } from "react";

import { Button } from "../ui/button";
import { DroppableArea } from "../ui/dnd/droppable-area";
import { FoodEntry } from "./food-entry";
import { MacroDisplay } from "./macro-display";
import { MealPlanContext } from "@/context/meal-plan-context";
import { MealType } from "@/types";
import { NotesList } from "./notes-list";
import { Text } from "../ui/text";
import { View } from "react-native";
import { calculateFoodEntriesNutrition } from "@/lib/utils/nutrition-calculator";
import { cn } from "../../lib/utils";
import { useUpdateFoodEntry } from "@/hooks/recipes/use-update-food-entry";

const MealTypeIcon = ({
	mealType,
	className,
}: {
	mealType: MealType;
	className?: string;
}) => {
	switch (mealType) {
		case "Breakfast":
			return <Egg className={className} />;
		case "Lunch":
			return <Hamburger className={className} />;
		case "Dinner":
			return <Salad className={className} />;
		case "Snack":
			return <Apple className={className} />;
	}
};

export const MealSection = ({
	mealType,
	date,
	foodEntries,
	onAdd,
}: {
	mealType: MealType;
	date: string;
	foodEntries?: any[];
	onAdd: () => void;
}) => {
	const { selectedProfileIds, openNotesModal } = useContext(MealPlanContext);
	const [isDropActive, setIsDropActive] = useState(false);
	const { mutate: updateFoodEntry } = useUpdateFoodEntry();

	// Filter food entries to only show those with selected profiles
	const filteredFoodEntries = foodEntries?.filter((entry: any) =>
		entry.profile_food_entry?.some(
			(pfe: any) =>
				pfe.number_of_servings > 0 && selectedProfileIds.has(pfe.profile_id),
		),
	);

	// Calculate total nutrition for this meal type
	const mealNutrition = useMemo(
		() =>
			calculateFoodEntriesNutrition(
				filteredFoodEntries || [],
				selectedProfileIds,
			),
		[filteredFoodEntries, selectedProfileIds],
	);

	const handleDrop = useCallback(
		(draggedData: any) => {
			const entry = draggedData?.entry;
			const sourceMealType = draggedData?.mealType;

			if (!entry) {
				return;
			}

			// Only update if the meal type is different from the source
			if (sourceMealType === mealType && entry.date === date) {
				return;
			}

			// Update the food entry with the new meal type and/or date
			updateFoodEntry({
				foodEntryId: entry.id,
				mealType: mealType,
				date: entry.date !== date ? date : undefined,
			});
		},
		[mealType, date, updateFoodEntry],
	);

	const isSingleProfile = selectedProfileIds.size === 1;

	return (
		<DroppableArea
			dropId={`meal-${date}-${mealType}`}
			onDrop={handleDrop}
			onActiveChange={setIsDropActive}
		>
			<View className="flex flex-row w-full">
				<View className="flex flex-col items-center pr-2 pt-[6px]">
					<MealTypeIcon
						mealType={mealType}
						className={cn("mb-1 h-4 w-4", isDropActive && "text-primary")}
					/>
					<View
						className={cn(
							"w-0.5 flex-1 rounded-full",
							isDropActive ? "bg-primary" : "bg-foreground",
						)}
					/>
				</View>
				<View className="flex min-w-0 flex-1 flex-col pb-4">
					<View className="mb-3 flex flex-col">
						<View className="flex flex-row items-start justify-between">
							<View className="flex flex-col gap-1">
								<Text
									className={cn(
										"mr-2 text-lg font-semibold",
										isDropActive && "text-primary",
									)}
								>
									{mealType}
								</Text>
								<MacroDisplay
									show={isSingleProfile}
									nutrition={mealNutrition}
									size="sm"
								/>
							</View>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										className="md:hidden rounded-full"
									>
										<Plus className="h-4 w-4 max-h-4 max-w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onPress={onAdd}>
										<Plus className="mr-2 h-4 w-4" />
										<Text>Add Recipe</Text>
									</DropdownMenuItem>
									<DropdownMenuItem
										onPress={() => openNotesModal(date, mealType)}
									>
										<NotebookText className="mr-2 h-4 w-4" />
										<Text>Add Note</Text>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</View>
					</View>
					<NotesList date={date} mealType={mealType} />
					<View className="space-y-1">
						{(!filteredFoodEntries || filteredFoodEntries.length === 0) && (
							<Text className="text-sm text-base-content/50">
								No {mealType.toLowerCase()} items added
							</Text>
						)}
						{filteredFoodEntries?.map((entry: any) => (
							<FoodEntry key={entry.id} entry={entry} />
						))}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="hidden md:flex md:flex-row max-w-32"
								>
									<Plus className="h-4 w-4" />
									<Text>Add</Text>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onPress={onAdd}>
									<Plus className="mr-2 h-4 w-4" />
									<Text>Add Recipe</Text>
								</DropdownMenuItem>
								<DropdownMenuItem
									onPress={() => openNotesModal(date, mealType)}
								>
									<NotebookText className="mr-2 h-4 w-4" />
									<Text>Add Note</Text>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</View>
				</View>
			</View>
		</DroppableArea>
	);
};
