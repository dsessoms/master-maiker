import { TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { Image } from "@/components/image";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";

export const MustrdHeader = () => {
	const router = useRouter();
	const { session } = useAuth();

	const handleLogoPress = () => {
		if (session?.user) {
			router.push("/(tabs)/(meal-plan)/meal-plan");
		} else {
			router.push("/");
		}
	};

	return (
		<View className="bg-background border-b border-border">
			<View className="w-full max-w-3xl mx-auto px-4 py-3">
				<TouchableOpacity
					onPress={handleLogoPress}
					activeOpacity={0.7}
					className="flex-row items-center gap-1"
				>
					<Image
						source={require("@/assets/bottle-logo.png")}
						className="w-10 h-10"
						contentFit="contain"
					/>
					<Text className="text-2xl font-bold">Mustrd</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};
