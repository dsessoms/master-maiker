import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function MealPlanStackLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{ title: "Meal Plan", headerShown: false }}
			/>
			<Stack.Screen
				name="add-recipe/index"
				options={{
					title: "Add Recipe",
					headerShown: true,
					presentation: "modal",
				}}
			/>
		</Stack>
	);
}
