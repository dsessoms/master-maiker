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
				name="profiles/index"
				options={{
					title: "Profiles",
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="profiles/[id]/edit"
				options={{
					title: "Edit Profile",
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="profiles/create"
				options={{
					title: "Create Profile",
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
