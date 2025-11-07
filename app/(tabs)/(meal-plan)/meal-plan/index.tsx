import { Stack, useRouter } from "expo-router";
import { eachDayOfInterval, format } from "date-fns";
import { useContext, useEffect, useMemo } from "react";

import { DaySection } from "@/components//meal-plan/day-section";
import { DnDProvider } from "@/components/ui/dnd/dnd-context";
import { DnDScrollView } from "@/components/ui/dnd/dnd-scroll-view";
import { MealPlanContext } from "@/context/meal-plan-context";
import { ProfileDropdown } from "@/components//user-dropdown";
import { SafeAreaView } from "@/components//safe-area-view";
import { View } from "react-native";
import { WeekSelector } from "@/components//week-selector";
import { useFoodEntries } from "@/hooks/recipes/use-food-entries";

export default function MealPlanScreen() {
	return (
		<DnDProvider>
			<MealPlanContent />
		</DnDProvider>
	);
}

function MealPlanContent() {
	const router = useRouter();
	const {
		startDate,
		endDate,
		viewThisWeek,
		viewNext,
		viewPrevious,
		selectableProfiles,
		onProfileToggle,
	} = useContext(MealPlanContext);
	const { foodEntries, isLoading, error } = useFoodEntries(startDate, endDate);

	const foodEntriesByDay = useMemo(() => {
		const finalMap: { [key: string]: typeof foodEntries } = {};
		foodEntries?.forEach((entry) => {
			// Ensure we're treating entry.date as a string for comparison
			const dateString =
				typeof entry.date === "string"
					? entry.date
					: format(new Date(entry.date), "yyyy-MM-dd");
			if (finalMap[dateString]) {
				finalMap[dateString].push(entry);
			} else {
				finalMap[dateString] = [entry];
			}
		});
		return finalMap;
	}, [foodEntries]);

	const weekDates = useMemo(
		() =>
			eachDayOfInterval({
				start: startDate,
				end: endDate,
			}),
		[startDate, endDate],
	);

	useEffect(() => {
		console.log(
			"weekDates:",
			weekDates.map((d) => format(d, "yyyy-MM-dd")),
		);
		console.log(
			"startDate:",
			format(startDate, "yyyy-MM-dd"),
			"endDate:",
			format(endDate, "yyyy-MM-dd"),
		);
	}, [weekDates, startDate, endDate]);

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
					<View />
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
		</SafeAreaView>
	);
}
