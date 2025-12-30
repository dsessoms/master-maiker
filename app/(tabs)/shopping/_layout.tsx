import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function ShoppingStackLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{ title: "Shopping List", headerShown: false }}
			/>
			<Stack.Screen
				name="[id]"
				options={{
					title: "Shopping List",
					headerShown: false,
				}}
			/>
		</Stack>
	);
}
