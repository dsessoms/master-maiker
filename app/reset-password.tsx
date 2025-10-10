import { ScrollView, View } from "react-native";

import { ResetPasswordForm } from "@/components/reset-password-form";
import { supabase } from "@/config/supabase";
import { useEffect } from "react";
import { useRouter } from "expo-router";

function parseURLFragments(url: string): Record<string, string> {
	const fragments: Record<string, string> = {};

	// Check if we're on web and have access to window.location
	if (typeof window !== "undefined" && window.location.hash) {
		const hash = window.location.hash.substring(1); // Remove the # symbol
		const params = new URLSearchParams(hash);

		for (const [key, value] of params.entries()) {
			fragments[key] = value;
		}
	}

	return fragments;
}

export default function ResetPassword() {
	const router = useRouter();

	useEffect(() => {
		// Parse URL fragments for auth tokens
		const fragments = parseURLFragments(window?.location?.href || "");

		if (fragments.access_token && fragments.refresh_token) {
			// Set the session using the tokens from the URL
			supabase.auth
				.setSession({
					access_token: fragments.access_token,
					refresh_token: fragments.refresh_token,
				})
				.then(({ data, error }) => {
					if (error) {
						console.error("Error setting session:", error);
					} else if (data.session) {
						console.log("Session set successfully for password reset");
					}
				});
		}
	}, []);

	return (
		<ScrollView
			className="bg-background"
			keyboardShouldPersistTaps="handled"
			contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
			keyboardDismissMode="interactive"
		>
			<View className="w-full max-w-sm">
				<ResetPasswordForm />
			</View>
		</ScrollView>
	);
}
