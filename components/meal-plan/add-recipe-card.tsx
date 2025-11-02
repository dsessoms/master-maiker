import { TouchableOpacity, View } from "react-native";
import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Image } from "@/components/image";
import { RecipeServingSelectorModal } from "./recipe-serving-selector-modal";
import { Text } from "@/components/ui/text";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";

type Recipe = {
	id: string;
	name: string;
	description?: string | null;
	image_id?: string | null;
	prep_time_hours?: number | null;
	prep_time_minutes?: number | null;
	cook_time_hours?: number | null;
	cook_time_minutes?: number | null;
	number_of_servings?: number;
	user_id?: string;
	created_at?: string;
	macros?: {
		[key: string]: any;
	}[];
};

type Profile = {
	id: string;
	name: string;
};

export const AddRecipeCard = ({
	recipe,
	profiles,
	isSelected,
	servings,
	onToggle,
	onServingsChange,
}: {
	recipe: Recipe;
	profiles: Profile[];
	isSelected: boolean;
	servings: { profile_id: string; servings: number }[];
	onToggle: () => void;
	onServingsChange: (
		servings: { profile_id: string; servings: number }[],
	) => void;
}) => {
	const { name, image_id } = recipe;
	const imageUrl = useRecipeImage(image_id);
	const [modalOpen, setModalOpen] = useState(false);

	const servingsText = useMemo(() => {
		if (servings.length === 0) return "No profiles selected";
		if (servings.length === 1) {
			const profile = profiles.find((p) => p.id === servings[0].profile_id);
			return `${profile?.name}: ${servings[0].servings} serving${servings[0].servings !== 1 ? "s" : ""}`;
		}
		return `${servings.length} profiles selected`;
	}, [servings, profiles]);

	const handleEditPress = () => {
		setModalOpen(true);
	};

	return (
		<>
			<TouchableOpacity
				onPress={onToggle}
				className="flex flex-col bg-card border border-border rounded-lg overflow-hidden active:bg-muted"
			>
				<View className="relative">
					{!!imageUrl ? (
						<Image
							source={{ uri: imageUrl }}
							className="h-24 w-full"
							contentFit="cover"
						/>
					) : (
						<View className="h-24 w-full bg-muted flex items-center justify-center overflow-hidden">
							<Text className="text-2xl font-bold text-muted-foreground opacity-20">
								{name.toUpperCase()}
							</Text>
						</View>
					)}

					{/* Checkbox overlay on top-left */}
					<View className="absolute top-2 left-2">
						<View className="w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center">
							<Checkbox
								checked={isSelected}
								disabled={false}
								onCheckedChange={onToggle}
							/>
						</View>
					</View>
				</View>

				{/* Recipe details */}
				<View className="flex flex-col p-2 gap-1">
					<Text className="text-xs font-semibold line-clamp-2">{name}</Text>
					{isSelected && (
						<TouchableOpacity onPress={handleEditPress}>
							<Text className="text-xs text-primary line-clamp-1 font-medium">
								{servingsText}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</TouchableOpacity>

			{/* Serving selector modal */}
			<RecipeServingSelectorModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				profiles={profiles}
				onConfirm={onServingsChange}
			/>
		</>
	);
};
