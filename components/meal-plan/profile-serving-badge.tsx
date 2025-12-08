import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

import { MealPlanContext } from "@/context/meal-plan-context";
import { Text } from "../ui/text";
import { View } from "react-native";
import { useContext } from "react";

interface ProfileServingBadgeProps {
	profileId: string;
	servings: number;
}

export const ProfileServingBadge = ({
	profileId,
	servings,
}: ProfileServingBadgeProps) => {
	const { selectableProfiles } = useContext(MealPlanContext);
	const profile = selectableProfiles.find((p) => p.id === profileId);

	if (!profile) {
		console.error(`No profile found with id: ${profileId}`);
		return null;
	}

	const initials = profile?.name ? profile.name.slice(0, 1).toUpperCase() : "?";

	return (
		<View className="flex-row items-center gap-0.5 pl-0.5 pr-2 py-0.5 bg-gray-200 rounded-full">
			<Avatar alt={`${profile?.name}'s Avatar`} className="h-5 w-5">
				{profile?.avatar_url ? (
					<AvatarImage source={{ uri: profile.avatar_url }} />
				) : null}
				<AvatarFallback>
					<Text className="text-xs font-semibold">{initials}</Text>
				</AvatarFallback>
			</Avatar>
			<Text className="text-sm font-medium text-gray-700">{servings}</Text>
		</View>
	);
};
