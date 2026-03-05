import { TouchableOpacity, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Image } from "@/components/image";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/supabase-provider";
import { useRouter } from "expo-router";

interface MustrdHeaderProps {
	maxWidth?: string;
	buttonText?: string;
	buttonRoute?: string;
	buttonVariant?: "default" | "secondary";
}

export const MustrdHeader = ({
	maxWidth = "max-w-3xl",
	buttonText = "Sign Up",
	buttonRoute = "/sign-up",
	buttonVariant = "default",
}: MustrdHeaderProps) => {
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
		<View className="bg-background">
			<View
				className={cn(
					"w-full mx-auto px-4 py-3 flex-row items-center justify-between",
					maxWidth,
				)}
			>
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
				{!session?.user && (
					<Button
						variant={buttonVariant}
						onPress={() => router.push(buttonRoute as any)}
					>
						<Text className="text-primary-foreground">{buttonText}</Text>
					</Button>
				)}
			</View>
		</View>
	);
};
