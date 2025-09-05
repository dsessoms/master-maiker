import { Stack } from "expo-router";

export default function RecipesStackLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Recipes" }} />
		</Stack>
	);
}
