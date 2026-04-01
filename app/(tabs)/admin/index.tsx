import { ChevronRight, CookingPot } from "@/lib/icons";
import { Pressable, ScrollView, View } from "react-native";

import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { useRouter } from "expo-router";

export default function Admin() {
	const router = useRouter();
	const { colorScheme } = useColorScheme();

	const iconColor = colorScheme === "dark" ? "#ffffff" : "#000000";

	const menuItems = [
		{
			icon: CookingPot,
			label: "Recipe Catalog",
			onPress: () => router.push("/(tabs)/admin/recipe-catalog"),
		},
	];

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 w-full max-w-3xl mx-auto gap-y-6">
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
