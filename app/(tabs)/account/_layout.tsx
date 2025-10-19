import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function AccountStackLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{ title: "Account", headerShown: false }}
			/>
			<Stack.Screen
				name="household-members"
				options={{
					title: "Household Members",
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="settings"
				options={{
					title: "Settings",
					headerShown: true,
				}}
			/>
		</Stack>
	);
}
