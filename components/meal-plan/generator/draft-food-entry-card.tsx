import { Pressable, View } from "react-native";

import type { DraftFoodEntry } from "@/lib/schemas/meal-plans/generate/draft-schema";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/image";
import { Lock } from "@/lib/icons";
import { LockOpen } from "lucide-react-native";
import { ProfileServingBadge } from "@/components/meal-plan/profile-serving-badge";
import { Text } from "@/components/ui/text";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";

interface DraftFoodEntryCardProps {
	entry: DraftFoodEntry;
	/** Called when the user taps the lock icon to toggle locked state */
	onToggleLock?: (draftEntryId: string) => void;
}

export function DraftFoodEntryCard({
	entry,
	onToggleLock,
}: DraftFoodEntryCardProps) {
	// Use first two letters of recipe name as the image placeholder text
	const initials = entry.recipe.name.slice(0, 2).toUpperCase();
	const imageUrl = useRecipeImage(entry.recipe.image_id);

	return (
		<View className="flex-1 flex-row gap-2 mb-2 p-2 bg-background rounded-md">
			{/* Image placeholder - mirrors the real FoodEntry layout */}
			<View className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 relative">
				{entry.recipe.is_leftover && (
					<View className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-amber-500/80">
						<Text className="text-xs text-white font-medium">leftover</Text>
					</View>
				)}
				{imageUrl ? (
					<Image
						source={{ uri: imageUrl }}
						className="w-full h-full"
						contentFit="cover"
					/>
				) : (
					<View className="w-full h-full bg-muted items-center justify-center">
						<Text className="text-lg font-bold text-muted-foreground opacity-20 px-1">
							{initials}
						</Text>
					</View>
				)}
			</View>

			{/* Content */}
			<View className="flex-1">
				{/* Name row */}
				<View className="flex-row items-center justify-between">
					<Text className="text-base font-medium flex-1 pr-2" numberOfLines={2}>
						{entry.recipe.name}
					</Text>
					<Pressable
						onPress={() => onToggleLock?.(entry.draft_entry_id)}
						hitSlop={8}
						className="p-1"
					>
						{entry.locked ? (
							<Lock size={15} className="text-primary" />
						) : (
							<Icon
								as={LockOpen}
								size={15}
								className="text-muted-foreground/50"
							/>
						)}
					</Pressable>
				</View>

				{/* Profile serving badges */}
				{entry.profile_food_entries.length > 0 && (
					<View className="flex-row flex-wrap gap-1 mt-1">
						{entry.profile_food_entries
							.filter((pfe) => pfe.number_of_servings > 0)
							.map((pfe) => (
								<ProfileServingBadge
									key={pfe.profile_id}
									profileId={pfe.profile_id}
									servings={pfe.number_of_servings}
								/>
							))}
					</View>
				)}
			</View>
		</View>
	);
}
