import { ChevronRight, Settings, User, Users, BugIcon } from "@/lib/icons";
import { ScrollView, TouchableOpacity, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";
import { useColorScheme } from "@/lib/useColorScheme";
import { useRouter } from "expo-router";
import * as Sentry from "@sentry/react-native";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Account() {
	const { signOut, session } = useAuth();
	const router = useRouter();
	const { colorScheme } = useColorScheme();

	const iconColor = colorScheme === "dark" ? "#ffffff" : "#000000";

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 w-full max-w-3xl mx-auto gap-y-6">
				<View className="p-6 relative">
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
					<DropdownMenu className="absolute top-6 right-6 ">
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="p-2">
								<Settings size={20} color={iconColor} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48 native:w-64">
							<DropdownMenuItem
								onPress={async () => {
									await signOut();
								}}
							>
								<Text>Sign Out</Text>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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

				<View className="gap-2">
					<Button
						className="w-full"
						size="default"
						variant="secondary"
						onPress={async () => {
							Sentry.showFeedbackWidget();
						}}
					>
						<View className="flex-row items-center gap-2">
							<BugIcon size={16} color={iconColor} />
							<Text>Report Bug</Text>
						</View>
					</Button>
				</View>
			</View>
		</ScrollView>
	);
}
