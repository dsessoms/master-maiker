import { Bell, Globe, Lock, Palette, Settings } from "@/lib/icons";
import { ScrollView, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";

export default function UserSettings() {
	const { colorScheme } = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#ffffff" : "#000000";

	// Dummy settings options
	const settingsOptions = [
		{
			id: 1,
			icon: Bell,
			title: "Notifications",
			description: "Manage your notification preferences",
		},
		{
			id: 2,
			icon: Lock,
			title: "Privacy & Security",
			description: "Control your privacy and security settings",
		},
		{
			id: 3,
			icon: Palette,
			title: "Appearance",
			description: "Customize the app's look and feel",
		},
		{
			id: 4,
			icon: Globe,
			title: "Language & Region",
			description: "Set your language and regional preferences",
		},
	];

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 gap-y-6">
				{/* Description */}
				<Muted>Customize your app experience and account preferences</Muted>

				{/* Settings Options */}
				<View className="gap-y-3">
					{settingsOptions.map((option) => {
						const IconComponent = option.icon;
						return (
							<Card key={option.id} className="p-4">
								<View className="flex-row items-center gap-x-3">
									<View className="w-10 h-10 bg-muted rounded-full items-center justify-center">
										<IconComponent size={18} color={iconColor} />
									</View>
									<View className="flex-1">
										<Text className="font-medium">{option.title}</Text>
										<Muted className="text-sm">{option.description}</Muted>
									</View>
								</View>
							</Card>
						);
					})}
				</View>

				{/* Coming Soon Notice */}
				<Card className="p-4 bg-muted/50">
					<Text className="text-center font-medium text-muted-foreground">
						🚧 Coming Soon
					</Text>
					<Muted className="text-center mt-1">
						User settings and preferences are currently in development.
					</Muted>
				</Card>
			</View>
		</ScrollView>
	);
}
