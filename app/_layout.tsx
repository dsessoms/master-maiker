import "../global.css";

import { AppStateStatus, Platform } from "react-native";
import {
	QueryClient,
	QueryClientProvider,
	focusManager,
} from "@tanstack/react-query";

import { AuthProvider } from "@/context/supabase-provider";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { ThemeContextProvider } from "@/context/theme-context";
import { colors } from "@/constants/colors";
import { useAppState } from "@/hooks/useAppStateChange";
import { useColorScheme } from "@/lib/useColorScheme";
import { useOnlineManager } from "@/hooks/useOnlineManager";

export const queryClient = new QueryClient();

function onAppStateChange(status: AppStateStatus) {
	// React Query already supports in web browser refetch on window focus by default
	if (Platform.OS !== "web") {
		focusManager.setFocused(status === "active");
	}
}

export default function AppLayout() {
	const { colorScheme } = useColorScheme();

	useOnlineManager();

	useAppState(onAppStateChange);

	return (
		<>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<ThemeContextProvider>
						<Stack
							screenOptions={{ headerShown: false, gestureEnabled: false }}
						>
							<Stack.Screen name="(tabs)" />
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
							<Stack.Screen
								name="forgot-password"
								options={{
									presentation: "modal",
									headerShown: true,
									headerTitle: "Reset Password",
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
								name="reset-password"
								options={{
									presentation: "modal",
									headerShown: true,
									headerTitle: "Reset Password",
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
					</ThemeContextProvider>
				</AuthProvider>
			</QueryClientProvider>
			<PortalHost />
		</>
	);
}
