import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function RecipesStackLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Recipes" }} />
			<Stack.Screen name="[id]/edit" options={{ title: "Edit Recipe" }} />
			<Stack.Screen
				name="import"
				options={{
					title: "Import Recipe",
					presentation: "modal",
					headerShown: true,
				}}
			/>
		</Stack>
	);
}
