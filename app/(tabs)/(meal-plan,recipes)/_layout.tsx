import { Stack } from "expo-router";

export const unstable_settings = {
	"meal-plan": {
		initialRouteName: "meal-plan/index",
	},
	recipes: {
		initialRouteName: "recipes/index",
	},
};

export default function StackLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="recipes/index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="meal-plan/index"
				options={{
					headerShown: false,
				}}
			/>
		</Stack>
	);
}
