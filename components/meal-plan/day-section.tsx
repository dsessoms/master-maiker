import { MealSection } from "./meal-section";
import { Text } from "../ui/text";
import { View } from "react-native";
import { format } from "date-fns";
import { useMemo } from "react";

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
	const recipeEntriesByMealType = useMemo(() => {
		const finalMap: { [key: string]: FoodEntry[] } = {};
		recipeEntries?.forEach((entry) => {
			if (finalMap[entry.mealType]) {
				finalMap[entry.mealType].push(entry);
			} else {
				finalMap[entry.mealType] = [entry];
			}
		});

		return finalMap;
	}, [recipeEntries]);
	return (
		<View className="min-w-96">
			<View className="mb-4 pt-2">
				<Text className="text-2xl mr-2">{format(date, "EEEE")}</Text>
			</View>
			<View>
				<MealSection
					mealType="breakfast"
					foodEntries={recipeEntriesByMealType["Breakfast"]}
					onAdd={() => onAdd("Breakfast")}
				/>
				<MealSection
					mealType="lunch"
					foodEntries={recipeEntriesByMealType["Lunch"]}
					onAdd={() => onAdd("Lunch")}
				/>
				<MealSection
					mealType="dinner"
					foodEntries={recipeEntriesByMealType["Dinner"]}
					onAdd={() => onAdd("Dinner")}
				/>
				<MealSection
					mealType="snack"
					foodEntries={recipeEntriesByMealType["Snack"]}
					onAdd={() => onAdd("Snack")}
				/>
			</View>
		</View>
	);
};
