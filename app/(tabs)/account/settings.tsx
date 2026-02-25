import { ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";
import { useRouter } from "expo-router";

export default function Settings() {
	const { signOut } = useAuth();
	const router = useRouter();

	const handleSignOut = async () => {
		await signOut();
		router.replace("/");
	};

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 w-full max-w-3xl mx-auto gap-y-6">
				<View className="gap-y-4">
					<View className="gap-y-4 mt-6">
						<Button
							variant="destructive"
							onPress={handleSignOut}
							className="w-full"
						>
							<Text>Sign Out</Text>
						</Button>
					</View>
				</View>
			</View>
		</ScrollView>
	);
}
