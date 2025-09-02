import "../global.css";

import { AuthProvider } from "@/context/supabase-provider";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

export default function AppLayout() {
	const { colorScheme } = useColorScheme();

	return (
		<>
			<AuthProvider>
				<Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
					<Stack.Screen name="(protected)" />
					<Stack.Screen name="welcome" />
					<Stack.Screen
						name="sign-up"
						options={{
							presentation: "modal",
							headerShown: true,
							headerTitle: "Sign Up",
							headerStyle: {
								backgroundColor:
									colorScheme === "dark"
										? colors.dark.background
										: colors.light.background,
							},
							headerTintColor:
								colorScheme === "dark"
									? colors.dark.foreground
									: colors.light.foreground,
							gestureEnabled: true,
						}}
					/>
					<Stack.Screen
						name="sign-in"
						options={{
							presentation: "modal",
							headerShown: true,
							headerTitle: "Sign In",
							headerStyle: {
								backgroundColor:
									colorScheme === "dark"
										? colors.dark.background
										: colors.light.background,
							},
							headerTintColor:
								colorScheme === "dark"
									? colors.dark.foreground
									: colors.light.foreground,
							gestureEnabled: true,
						}}
					/>
				</Stack>
			</AuthProvider>
			<PortalHost />
		</>
	);
}
