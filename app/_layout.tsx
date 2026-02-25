import "../global.css";

import { AppStateStatus, Platform } from "react-native";
import {
	QueryClient,
	QueryClientProvider,
	focusManager,
} from "@tanstack/react-query";

import { AuthProvider } from "@/context/supabase-provider";
import { DnDProvider } from "@/components/ui/dnd/dnd-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { ThemeContextProvider } from "@/context/theme-context";
import { colors } from "@/constants/colors";
import { useAppState } from "@/hooks/useAppStateChange";
import { useColorScheme } from "@/lib/useColorScheme";
import { useOnlineManager } from "@/hooks/useOnlineManager";
import * as Sentry from "@sentry/react-native";

Sentry.init({
	dsn: "https://a2ddd05ab1b215f90bab7b2ebe213037@o4510944951861248.ingest.us.sentry.io/4510944990658560",

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Enable Logs
	enableLogs: true,

	// Configure Session Replay
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1,
	integrations: [
		Sentry.mobileReplayIntegration(),
		Sentry.feedbackIntegration(),
	],

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: __DEV__,
});

export const queryClient = new QueryClient();

function onAppStateChange(status: AppStateStatus) {
	// React Query already supports in web browser refetch on window focus by default
	if (Platform.OS !== "web") {
		focusManager.setFocused(status === "active");
	}
}

export default Sentry.wrap(function AppLayout() {
	const { colorScheme } = useColorScheme();

	useOnlineManager();

	useAppState(onAppStateChange);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<DnDProvider>
				<QueryClientProvider client={queryClient}>
					<AuthProvider>
						<ThemeContextProvider>
							<Stack
								screenOptions={{ headerShown: false, gestureEnabled: false }}
							>
								<Stack.Screen name="(tabs)" />
								<Stack.Screen name="welcome" />
								<Stack.Screen name="public/recipes/[id]/index" />
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
			</DnDProvider>
			<PortalHost />
		</GestureHandlerRootView>
	);
});
