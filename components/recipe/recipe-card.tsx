import { TouchableOpacity, View } from "react-native";

import { Image } from "@/components/image";
import { ReactNode } from "react";
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
	macros?: {
		[key: string]: any;
	}[];
};

type RecipeCardProps = {
	recipe: Recipe;
	onPress: () => void;
	overlay?: ReactNode;
	children?: ReactNode;
};

export const RecipeCard = ({
	recipe,
	onPress,
	overlay,
	children,
}: RecipeCardProps) => {
	const { image_id, name } = recipe;
	const imageUrl = useRecipeImage(image_id);

	return (
		<TouchableOpacity
			onPress={onPress}
			className="flex flex-col bg-card border border-border rounded-lg overflow-hidden active:bg-muted"
		>
			<View className="relative">
				{!!imageUrl ? (
					<Image
						source={{ uri: imageUrl }}
						className="h-48 w-full"
						contentFit="cover"
					/>
				) : (
					<View className="h-48 w-full bg-muted flex items-center justify-center overflow-hidden">
						<Text className="text-6xl font-bold text-muted-foreground opacity-20">
							{name.toUpperCase()}
						</Text>
					</View>
				)}

				{overlay}
			</View>

			<View className="flex flex-col p-2 h-16">
				<Text className="text-sm font-semibold mb-1 line-clamp-2">{name}</Text>
				{children}
			</View>
		</TouchableOpacity>
	);
};
