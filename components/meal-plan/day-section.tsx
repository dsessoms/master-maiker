import { useContext, useMemo } from "react";

import { FoodEntry } from "@/app/api/food-entries/index+api";
import { MacroDisplay } from "./macro-display";
import { MealPlanContext } from "@/context/meal-plan-context";
import { MealSection } from "./meal-section";
import { Text } from "../ui/text";
import { View } from "react-native";
import { calculateFoodEntriesNutrition } from "@/lib/utils/nutrition-calculator";
import { format } from "date-fns";

export const DaySection = ({
	date,
	recipeEntries,
	onAdd,
}: {
	date: Date;
	recipeEntries: FoodEntry[];
	onAdd: (mealType: string) => void;
}) => {
	const { selectableProfiles } = useContext(MealPlanContext);

	const recipeEntriesByMealType = useMemo(() => {
		const finalMap: { [key: string]: FoodEntry[] } = {};
		recipeEntries?.forEach((entry) => {
			if (finalMap[entry.meal_type]) {
				finalMap[entry.meal_type].push(entry);
			} else {
				finalMap[entry.meal_type] = [entry];
			}
		});

		return finalMap;
	}, [recipeEntries]);

	// Calculate total nutrition for the entire day
	const selectedProfileIds = useMemo(
		() =>
			new Set(
				selectableProfiles
					.filter((p: any) => p.isSelected)
					.map((p: any) => p.id),
			),
		[selectableProfiles],
	);

	const dayNutrition = useMemo(
		() =>
			calculateFoodEntriesNutrition(recipeEntries || [], selectedProfileIds),
		[recipeEntries, selectedProfileIds],
	);

	const dateString = format(date, "yyyy-MM-dd");

	return (
		<View className="min-w-96">
			<View className="mb-4 mt-8">
				<View className="flex flex-row items-center justify-between">
					<Text className="text-2xl mr-2">{format(date, "EEEE")}</Text>
					<MacroDisplay nutrition={dayNutrition} size="md" />
				</View>
			</View>
			<View>
				<MealSection
					mealType="Breakfast"
					date={dateString}
					foodEntries={recipeEntriesByMealType["Breakfast"]}
					onAdd={() => onAdd("Breakfast")}
				/>
				<MealSection
					mealType="Lunch"
					date={dateString}
					foodEntries={recipeEntriesByMealType["Lunch"]}
					onAdd={() => onAdd("Lunch")}
				/>
				<MealSection
					mealType="Dinner"
					date={dateString}
					foodEntries={recipeEntriesByMealType["Dinner"]}
					onAdd={() => onAdd("Dinner")}
				/>
				<MealSection
					mealType="Snack"
					date={dateString}
					foodEntries={recipeEntriesByMealType["Snack"]}
					onAdd={() => onAdd("Snack")}
				/>
			</View>
		</View>
	);
};
