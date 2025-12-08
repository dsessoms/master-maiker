import { eachDayOfInterval, format } from "date-fns";

import { ExpandableFoodEntry } from "./expandable-food-entry";
import { GeneratedMealPlan } from "@/lib/schemas";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { useMemo } from "react";
import { useRecipes } from "@/hooks/recipes/use-recipes";

export const MealPlanPreview = ({
	startDate,
	endDate,
	mealPlan,
}: {
	startDate: string;
	endDate: string;
	mealPlan: GeneratedMealPlan;
}) => {
	const { recipes } = useRecipes();

	const foodEntriesByDayAndMealType = useMemo(() => {
		const finalMap: {
			[date: string]: { [mealType: string]: typeof mealPlan.foodEntries };
		} = {};
		mealPlan.foodEntries?.forEach((entry) => {
			const dateString =
				typeof entry.date === "string"
					? entry.date
					: format(new Date(entry.date), "yyyy-MM-dd");

			if (!finalMap[dateString]) {
				finalMap[dateString] = {};
			}

			if (finalMap[dateString][entry.meal_type]) {
				finalMap[dateString][entry.meal_type].push(entry);
			} else {
				finalMap[dateString][entry.meal_type] = [entry];
			}
		});
		return finalMap;
	}, [mealPlan]);

	const notesByDayAndMealType = useMemo(() => {
		const finalMap: {
			[date: string]: { [mealType: string]: typeof mealPlan.notes };
		} = {};
		mealPlan.notes?.forEach((note) => {
			if (!finalMap[note.date]) {
				finalMap[note.date] = {};
			}

			if (finalMap[note.date][note.meal_type]) {
				finalMap[note.date][note.meal_type].push(note);
			} else {
				finalMap[note.date][note.meal_type] = [note];
			}
		});
		return finalMap;
	}, [mealPlan]);

	console.log(startDate, endDate, foodEntriesByDayAndMealType);

	const weekDates = useMemo(
		() =>
			eachDayOfInterval({
				start: startDate,
				end: endDate,
			}),
		[startDate, endDate],
	);

	return (
		<View>
			{weekDates.map((date) => {
				const dateString = format(date, "yyyy-MM-dd");
				const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

				return (
					<View key={dateString} className="mb-6">
						<Text className="text-lg font-bold mb-3">
							{format(date, "EEEE, MMM d")}
						</Text>

						{mealTypes.map((mealType) => {
							const foodEntries =
								foodEntriesByDayAndMealType[dateString]?.[mealType];
							const notes = notesByDayAndMealType[dateString]?.[mealType];

							if (!foodEntries?.length && !notes?.length) {
								return null;
							}

							return (
								<View key={mealType} className="mb-4 ml-2">
									<Text className="text-base font-semibold capitalize mb-2">
										{mealType}
									</Text>

									{/* Notes */}
									{notes?.length > 0 && (
										<View className="mb-2">
											{notes.map((note, idx) => (
												<Text
													key={idx}
													className="text-sm text-gray-600 italic mb-1"
												>
													📝 {note.note}
												</Text>
											))}
										</View>
									)}

									{/* Food Entries */}
									{foodEntries?.length > 0 && (
										<View className="gap-2">
											{foodEntries.map((entry) => {
												const recipe = mealPlan.recipes.find(
													(recipe) => recipe.id === entry.recipe_id,
												);

												// If recipe not found in mealPlan or doesn't have a name,
												// try to get it from saved recipes
												const recipeName =
													recipe?.name ||
													recipes?.find(
														(savedRecipe) => savedRecipe.id === entry.recipe_id,
													)?.name;

												if (!recipeName) {
													return null;
												}

												return (
													<ExpandableFoodEntry
														key={entry.recipe_id}
														entry={entry}
														recipe={recipe}
														recipeName={recipeName}
													/>
												);
											})}
										</View>
									)}
								</View>
							);
						})}
					</View>
				);
			})}
		</View>
	);
};
