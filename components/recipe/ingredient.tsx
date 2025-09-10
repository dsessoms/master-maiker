import { ExpandedIngredient } from "../../types";
import { Image } from "@/components/image";
import { Text } from "../ui/text";
import { View } from "react-native";

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
	const displayUnits = ingredient.serving.number_of_units * displayServings;

	return (
		<View className="flex flex-row items-center py-2">
			{/* Thumbnail image or placeholder */}
			<View
				style={{
					width: 40,
					height: 40,
					borderRadius: 20,
					marginRight: 12,
					backgroundColor: ingredient.food.image_url
						? "transparent"
						: "#e5e5e5",
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
				) : null}
			</View>

			{/* Text content */}
			<View style={{ flex: 1 }}>
				<View className="flex flex-row items-center flex-wrap">
					<Text className="font-medium text-base">
						{displayUnits.toFixed(displayUnits % 1 === 0 ? 0 : 1)}{" "}
						{ingredient.serving.measurement_description}{" "}
					</Text>
					<Text className="text-base">
						{ingredient.food.food_name}
						{ingredient.food.brand_name && ` (${ingredient.food.brand_name})`}
					</Text>
					{ingredient.meta && (
						<Text className="text-sm text-muted-foreground ml-1">
							({ingredient.meta})
						</Text>
					)}
				</View>
			</View>
		</View>
	);
}
