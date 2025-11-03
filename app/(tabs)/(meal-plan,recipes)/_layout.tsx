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
	return <Stack />;
}
