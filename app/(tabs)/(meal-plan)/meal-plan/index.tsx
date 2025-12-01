import { Stack, useRouter } from "expo-router";
import { eachDayOfInterval, format } from "date-fns";
import { useContext, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DaySection } from "@/components//meal-plan/day-section";
import { DnDScrollView } from "@/components/ui/dnd/dnd-scroll-view";
import { MealPlanContext } from "@/context/meal-plan-context";
import { NotesModal } from "@/components/meal-plan/notes-modal";
import { ProfileDropdown } from "@/components//user-dropdown";
import { SafeAreaView } from "@/components//safe-area-view";
import { View } from "react-native";
import { WeekSelector } from "@/components//week-selector";
import { useToggle } from "@/hooks/useToggle";

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
	} = useContext(MealPlanContext);

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
			{notesModalState && (
				<NotesModal
					isVisible={!!notesModalState}
					toggleIsVisible={closeNotesModal}
					date={notesModalState.date}
					mealType={notesModalState.mealType}
				/>
			)}
		</SafeAreaView>
	);
}
