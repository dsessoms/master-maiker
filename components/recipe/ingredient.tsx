import { ExpandedIngredient } from "../../types";
import { Image } from "@/components/image";
import { ShoppingBasket } from "@/lib/icons";
import { Text } from "../ui/text";
import { View } from "react-native";
import { getServingDescription } from "@/lib/utils/serving-description";

interface IngredientProps {
	ingredient: ExpandedIngredient;
	recipeServingsMultiplier: number;
}

export function Ingredient({
	ingredient,
	recipeServingsMultiplier,
}: IngredientProps) {
	if (
		!ingredient.food ||
		!ingredient.serving ||
		!ingredient.number_of_servings
	) {
		return null;
	}

	const displayServings =
		ingredient.number_of_servings * recipeServingsMultiplier;
	const servingDesc = getServingDescription(
		displayServings,
		ingredient.serving,
		ingredient.food,
	);

	return (
		<View className="flex flex-row items-center py-2">
			{/* Thumbnail image or placeholder */}
			<View
				style={{
					width: 40,
					height: 40,
					borderRadius: 20,
					marginRight: 12,
					overflow: "hidden",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				{ingredient.food.image_url ? (
					<Image
						source={{ uri: ingredient.food.image_url }}
						style={{
							width: 30,
							height: 30,
						}}
						contentFit="contain"
					/>
				) : (
					<ShoppingBasket size={20} color="#666" />
				)}
			</View>

			{/* Text content */}
			<View style={{ flex: 1 }}>
				<View className="flex flex-row items-center flex-wrap">
					<Text className="font-medium text-base">{`${servingDesc} `}</Text>
					<Text className="text-base">
						{ingredient.food.food_name}
						{ingredient.food.brand_name && ` (${ingredient.food.brand_name})`}
					</Text>
				</View>
				{ingredient.meta && (
					<Text className="text-sm text-muted-foreground">
						{ingredient.meta}
					</Text>
				)}
			</View>
		</View>
	);
}
