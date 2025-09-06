import { ExpandedIngredient } from "../../types";
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
	if (!ingredient.food || !ingredient.serving) {
		return null;
	}

	const displayServings =
		ingredient.number_of_servings * recipeServingsMultiplier;
	const displayUnits = ingredient.serving.number_of_units * displayServings;

	return (
		<View className="flex flex-row items-center py-1">
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
	);
}
