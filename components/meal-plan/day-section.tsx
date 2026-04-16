import { format, isToday } from "date-fns";
import { useContext, useMemo } from "react";

import { Dot } from "@/lib/icons";
import { FoodEntry } from "@/app/api/food-entries/index+api";
import { MEAL_TYPES } from "@/lib/meal-plan-draft/types";
import { MacroDisplay } from "./macro-display";
import { MealPlanContext } from "@/context/meal-plan-context";
import { MealSection } from "./meal-section";
import { Text } from "../ui/text";
import { View } from "react-native";
import { calculateFoodEntriesNutrition } from "@/lib/utils/nutrition-calculator";

export const DaySection = ({
	date,
	recipeEntries,
	onAdd,
}: {
	date: Date;
	recipeEntries: FoodEntry[];
	onAdd: (mealType: string) => void;
}) => {
	const { selectedProfileIds } = useContext(MealPlanContext);

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

	const dayNutrition = useMemo(
		() =>
			calculateFoodEntriesNutrition(recipeEntries || [], selectedProfileIds),
		[recipeEntries, selectedProfileIds],
	);

	const dateString = format(date, "yyyy-MM-dd");

	const isSingleProfile = selectedProfileIds.size === 1;
	const isCurrentDay = isToday(date);

	return (
		<View>
			<View className="mb-4 mt-8">
				<View className="flex flex-row items-center justify-between">
					<View className="relative flex flex-row items-center">
						<Text className="text-2xl">{format(date, "EEEE")}</Text>
						{isCurrentDay && (
							<Dot size={40} className="absolute top-[-16] right-[-24]" />
						)}
					</View>
					<MacroDisplay
						show={isSingleProfile}
						nutrition={dayNutrition}
						size="md"
					/>
				</View>
			</View>
			<View>
				{MEAL_TYPES.map((mealType) => (
					<MealSection
						key={mealType}
						mealType={mealType}
						date={dateString}
						foodEntries={recipeEntriesByMealType[mealType]}
						onAdd={() => onAdd(mealType)}
					/>
				))}
			</View>
		</View>
	);
};
