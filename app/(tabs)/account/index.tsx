import { ChevronRight, Settings, User, Users, BugIcon } from "@/lib/icons";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/supabase-provider";
import { useColorScheme } from "@/lib/useColorScheme";
import { useRouter } from "expo-router";
import * as Sentry from "@sentry/react-native";

export default function Account() {
	const { session } = useAuth();
	const router = useRouter();
	const { colorScheme } = useColorScheme();

	const iconColor = colorScheme === "dark" ? "#ffffff" : "#000000";

	const menuItems = [
		{
			icon: Users,
			label: "Profiles",
			onPress: () => router.push("/(tabs)/account/profiles"),
		},
		{
			icon: Settings,
			label: "Settings",
			onPress: () => router.push("/(tabs)/account/settings"),
		},
		{
			icon: BugIcon,
			label: "Report Bug",
			onPress: () => Sentry.showFeedbackWidget(),
		},
	];

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 w-full max-w-3xl mx-auto gap-y-6">
				<View className="p-6">
					<View className="items-center gap-y-3">
						<View className="w-16 h-16 bg-primary rounded-full items-center justify-center">
							<User size={28} color="white" />
						</View>
						<View className="items-center">
							<Text className="text-lg font-semibold text-center">
								{session?.user?.email || "User"}
							</Text>
						</View>
					</View>
				</View>

				{/* Menu Items */}
				<View className="bg-card rounded-lg overflow-hidden">
					{menuItems.map((item, index) => {
						const Icon = item.icon;
						return (
							<View key={item.label}>
								<Pressable
									className="flex-row items-center justify-between p-4"
									onPress={item.onPress}
								>
									<View className="flex-row items-center gap-x-3">
										<Icon size={20} color={iconColor} />
										<Text className="font-medium">{item.label}</Text>
									</View>
									<ChevronRight size={16} color={iconColor} />
								</Pressable>
								{index < menuItems.length - 1 && <Separator />}
							</View>
						);
					})}
				</View>
			</View>
		</ScrollView>
	);
}
