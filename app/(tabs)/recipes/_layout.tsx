import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function RecipesStackLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Recipes" }} />
		</Stack>
	);
}
