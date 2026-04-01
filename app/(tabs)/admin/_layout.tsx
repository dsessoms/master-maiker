import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function AdminStackLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{ title: "Admin", headerShown: false }}
			/>
			<Stack.Screen
				name="recipe-catalog/index"
				options={{ title: "Recipe Catalog" }}
			/>
			<Stack.Screen name="recipe-catalog/[id]" options={{ title: "Recipe" }} />
		</Stack>
	);
}
