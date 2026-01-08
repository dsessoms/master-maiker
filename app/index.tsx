import { H1, Large, Muted } from "@/components/ui/typography";
import { Platform, ScrollView, View } from "react-native";
import { Redirect, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { Image } from "@/components/image";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";

export default function LandingPage() {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	// Redirect to welcome page on mobile
	if (Platform.OS !== "web") {
		return <Redirect href="/welcome" />;
	}

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="flex-1 min-h-screen">
				{/* Hero Section */}
				<View className="flex-1 flex-row items-center justify-center px-8 py-16 web:px-16 web:py-24 gap-12 flex-wrap">
					{/* Left Content */}
					<View className="flex-1 min-w-[300px] max-w-[600px] gap-6">
						<View className="gap-4">
							<View className="flex-row items-center gap-2">
								<Text className="text-3xl md:text-4xl lg:text-5xl font-normal text-primary">
									mustrd
								</Text>
							</View>

							<View>
								<H1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight">
									Delightful
								</H1>
								<H1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight">
									meal planning
								</H1>
								<Text className="text-4xl md:text-5xl lg:text-7xl font-bold text-primary">
									starts here.
								</Text>
							</View>
						</View>

						<Large className="text-muted-foreground max-w-[500px]">
							Plan your weekly meals, organize your recipes, and create smart
							shopping lists. Make meal planning effortless today.
						</Large>

						<Button
							size="lg"
							className="w-fit px-8 py-6 bg-foreground self-start"
							onPress={() => {
								router.push("/sign-up");
							}}
						>
							<Text className="text-background font-semibold text-lg">
								Create Your First Meal Plan
							</Text>
						</Button>
					</View>

					{/* Right Content - Phone Mockup */}
					<View className="flex-1 min-w-[300px] max-w-[500px] items-center justify-center">
						<View className="relative">
							{/* Gradient Background Circle */}
							<LinearGradient
								colors={
									isDark
										? ["#3b82f6", "#8b5cf6", "#ec4899"]
										: ["#60a5fa", "#a78bfa", "#f472b6"]
								}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								className="absolute rounded-full opacity-20"
								style={{
									width: 500,
									height: 500,
									top: "50%",
									left: "50%",
									transform: [{ translateX: -250 }, { translateY: -250 }],
								}}
							/>

							{/* Phone Image */}
							<Image
								source={require("@/assets/hero-phone-meal-plan.png")}
								contentFit="contain"
								className="w-[400px] h-[600px] web:w-[500px] web:h-[700px]"
								style={{
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 20 },
									shadowOpacity: 0.3,
									shadowRadius: 40,
								}}
							/>

							{/* Floating Accent Elements */}
							<View
								className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-primary opacity-80"
								style={{
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 4 },
									shadowOpacity: 0.2,
									shadowRadius: 8,
								}}
							/>
							<View
								className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-destructive opacity-60"
								style={{
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 4 },
									shadowOpacity: 0.2,
									shadowRadius: 8,
								}}
							/>
						</View>
					</View>
				</View>

				{/* Footer */}
				<View className="py-8 px-8 border-t border-border">
					<Muted className="text-center">
						Already have an account?{" "}
						<Text
							className="text-primary font-semibold"
							onPress={() => router.push("/sign-in")}
						>
							Sign In
						</Text>
					</Muted>
				</View>
			</View>
		</ScrollView>
	);
}
