import { H1, Muted } from "@/components/ui/typography";

import { Button } from "@/components/ui/button";
import { Image } from "@/components/image";
import React from "react";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const appIcon =
		colorScheme === "dark"
			? require("@/assets/logo-with-yellow-background.png")
			: require("@/assets/logo-with-no-background.png");

	return (
		<SafeAreaView className="flex flex-1 bg-background p-4">
			<View className="flex flex-1 items-center justify-center gap-y-4 web:m-4">
				<Image source={appIcon} className="w-16 h-16 rounded-xl" />
				<H1 className="text-center">Mustrd</H1>
				<Muted className="text-center">
					Meal Utility System To Reduce Decisions
				</Muted>
			</View>
			<View className="flex flex-col gap-y-4 web:m-4">
				<Button
					size="default"
					variant="default"
					onPress={() => {
						router.push("/sign-up");
					}}
				>
					<Text>Sign Up</Text>
				</Button>
				<Button
					size="default"
					variant="secondary"
					onPress={() => {
						router.push("/sign-in");
					}}
				>
					<Text>Sign In</Text>
				</Button>
			</View>
		</SafeAreaView>
	);
}
