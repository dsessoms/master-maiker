import { ChevronRight, Settings, User, Users } from "@/lib/icons";
import { ScrollView, TouchableOpacity, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";
import { useColorScheme } from "@/lib/useColorScheme";
import { useRouter } from "expo-router";

export default function Account() {
	const { signOut, session } = useAuth();
	const router = useRouter();
	const { colorScheme } = useColorScheme();

	const iconColor = colorScheme === "dark" ? "#ffffff" : "#000000";

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 w-full max-w-3xl mx-auto gap-y-6">
				<View>
					<Card className="p-6 relative">
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
					</Card>
				</View>

				<View>
					<Card className="p-0">
						<TouchableOpacity
							className="flex-row items-center justify-between p-4"
							onPress={() => router.push("/(tabs)/account/profiles")}
						>
							<View className="flex-row items-center gap-x-3">
								<Users size={20} color={iconColor} />
								<View>
									<Text className="font-medium">Profiles</Text>
									<Muted className="text-sm">Manage profiles</Muted>
								</View>
							</View>
							<ChevronRight size={16} color={iconColor} />
						</TouchableOpacity>
					</Card>
				</View>

				<View>
					<Button
						className="w-full"
						size="default"
						variant="secondary"
						onPress={async () => {
							await signOut();
						}}
					>
						<Text>Sign Out</Text>
					</Button>
				</View>
			</View>
		</ScrollView>
	);
}
