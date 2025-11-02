import { useContext, useMemo } from "react";

import { MealPlanContext } from "@/context/meal-plan-context";
import { MealSection } from "./meal-section";
import { Text } from "../ui/text";
import { View } from "react-native";
import { format } from "date-fns";

type FoodEntry = any; // TODO: replace with real type

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
	return (
		<View className="min-w-96">
			<View className="mb-4 mt-8">
				<Text className="text-2xl mr-2">{format(date, "EEEE")}</Text>
			</View>
			<View>
				<MealSection
					mealType="Breakfast"
					foodEntries={recipeEntriesByMealType["Breakfast"]}
					onAdd={() => onAdd("Breakfast")}
				/>
				<MealSection
					mealType="Lunch"
					foodEntries={recipeEntriesByMealType["Lunch"]}
					onAdd={() => onAdd("Lunch")}
				/>
				<MealSection
					mealType="Dinner"
					foodEntries={recipeEntriesByMealType["Dinner"]}
					onAdd={() => onAdd("Dinner")}
				/>
				<MealSection
					mealType="Snack"
					foodEntries={recipeEntriesByMealType["Snack"]}
					onAdd={() => onAdd("Snack")}
				/>
			</View>
		</View>
	);
};
