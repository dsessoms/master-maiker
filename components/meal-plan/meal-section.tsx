import { Apple, Egg, Hamburger, Plus, Salad } from "../../lib/icons";

import { Button } from "../ui/button";
import { FoodEntry } from "./food-entry";
import { MealPlanContext } from "@/context/meal-plan-context";
import { MealType } from "@/types";
import { Text } from "../ui/text";
import { View } from "react-native";
import { cn } from "../../lib/utils";
import { useContext } from "react";

const MealTypeIcon = {
	Breakfast: <Egg className="mb-1 h-4 w-4" />,
	Lunch: <Hamburger className="mb-1 h-4 w-4" />,
	Dinner: <Salad className="mb-1 h-4 w-4" />,
	Snack: <Apple className="mb-1 h-4 w-4" />,
};

export const MealSection = ({
	mealType,
	foodEntries,
	onAdd,
}: {
	mealType: MealType;
	foodEntries?: any[];
	onAdd: () => void;
}) => {
	const { selectableProfiles } = useContext(MealPlanContext);
	// Create a set of selected profile IDs
	const selectedProfileIds = new Set(
		selectableProfiles.filter((p: any) => p.isSelected).map((p: any) => p.id),
	);

	// Filter food entries to only show those with selected profiles
	const filteredFoodEntries = foodEntries?.filter((entry: any) =>
		entry.profile_food_entry?.some(
			(pfe: any) =>
				pfe.number_of_servings > 0 && selectedProfileIds.has(pfe.profile_id),
		),
	);
	return (
		<View className="flex flex-row w-full">
			<View className="flex flex-col items-center pr-2 pt-[6px]">
				{MealTypeIcon[mealType]}
				<View className={cn("w-0.5 flex-1 rounded-full", "bg-foreground")} />
			</View>
			<View className="flex min-w-0 flex-1 flex-col pb-4">
				<View className="mb-3 flex flex-col">
					<View className="flex flex-row items-start justify-between">
						<Text className="mr-2 w-24 text-lg font-semibold">{mealType}</Text>
						<Button
							size="icon"
							onPress={onAdd}
							variant="outline"
							className="md:hidden rounded-full"
						>
							<Plus className="h-4 w-4 max-h-4 max-w-4" />
						</Button>
					</View>
				</View>
				<View className="space-y-1">
					{(!filteredFoodEntries || filteredFoodEntries.length === 0) && (
						<Text className="text-sm text-base-content/50">
							No {mealType.toLowerCase()} items added
						</Text>
					)}
					{filteredFoodEntries?.map((entry: any) => (
						<FoodEntry key={entry.id} entry={entry} />
					))}
					<Button
						onPress={onAdd}
						variant="outline"
						size="sm"
						className="hidden md:flex md:flex-row max-w-32"
					>
						<Plus className="h-4 w-4" />
						<Text>Add</Text>
					</Button>
				</View>
			</View>
		</View>
	);
};
