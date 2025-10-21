import { ScrollView, View } from "react-native";
import { eachDayOfInterval, format } from "date-fns";
import { useContext, useEffect, useMemo, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DaySection } from "@/components//meal-plan/day-section";
import { MealPlanContext } from "@/context/meal-plan-context";
import { ProfileDropdown } from "@/components//user-dropdown";
import { SafeAreaView } from "@/components//safe-area-view";
import { WeekSelector } from "@/components//week-selector";
import { useProfiles } from "@/hooks/profiles/useProfiles";

type MealPlan = any; // TODO: update with real type
type FoodEntry = any; // TODO: replace with real type

export default function MealPlanScreen() {
	const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
	const { startDate, endDate, viewThisWeek, viewNext, viewPrevious } =
		useContext(MealPlanContext);
	const { profiles = [] } = useProfiles();
	const [selectableProfiles, setSelectableProfiles] = useState(
		profiles.map((profile) => ({ ...profile, isSelected: true })),
	);

	useEffect(() => {
		setSelectableProfiles(
			profiles.map((profile) => ({ ...profile, isSelected: true })),
		);
	}, [profiles]);

	const onProfileToggle = (profileId: string) => {
		const newProfileArray = [...selectableProfiles];
		const profileIndex = newProfileArray.findIndex(
			(profile) => profile.id === profileId,
		);
		newProfileArray[profileIndex].isSelected =
			!newProfileArray[profileIndex].isSelected;
		setSelectableProfiles(newProfileArray);
	};

	// Load meal plan from storage on mount
	useEffect(() => {
		(async () => {
			const stored = await AsyncStorage.getItem("mealPlan");
			if (stored) {
				try {
					setMealPlan(JSON.parse(stored));
				} catch {}
			}
		})();
	}, []);

	// Save meal plan to storage when it changes
	useEffect(() => {
		if (mealPlan) {
			AsyncStorage.setItem("mealPlan", JSON.stringify(mealPlan));
		}
	}, [mealPlan]);

	const recipeEntriesByDay = useMemo(() => {
		const finalMap: { [key: string]: NonNullable<FoodEntry>[] } = {};
		mealPlan?.foodEntries.forEach((entry: FoodEntry) => {
			const dateString = format(entry.date, "yyyy-MM-dd");
			if (finalMap[dateString]) {
				finalMap[dateString].push(entry);
			} else {
				finalMap[dateString] = [entry];
			}
		});
		return finalMap;
	}, [mealPlan?.foodEntries]);

	const weekDates = eachDayOfInterval({
		start: startDate,
		end: endDate,
	});

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<View className="flex flex-1 p-2">
				<View className="flex flex-row justify-between pb-4">
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
					<View></View>
				</View>
				<ScrollView
					contentContainerStyle={{ padding: 16, flexGrow: 1 }}
					style={{ flex: 1 }}
				>
					{weekDates.map((date) => {
						const dateString = format(date, "yyyy-MM-dd");
						return (
							<DaySection
								key={dateString}
								date={date}
								recipeEntries={recipeEntriesByDay[dateString]}
								onAdd={() => null}
							/>
						);
					})}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
}
