import * as React from "react";

import { ExpandedRecipe, IngredientMap } from "./types";
import { Minus, Plus } from "@/lib/icons";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

const getServingDescription = (
	numberOfServings: number,
	serving: {
		measurement_description: string | null;
		number_of_units: number | null;
	},
) => {
	if (!serving.number_of_units) {
		return `${numberOfServings} ${serving.measurement_description || "serving"}`;
	}

	const totalUnits = numberOfServings * serving.number_of_units;
	return serving.measurement_description
		? `${totalUnits} ${serving.measurement_description}`
		: totalUnits.toString();
};

export const RecipeCheckList = ({
	recipe,
	numberOfServings,
	ingredientMap,
	updateSelection,
	updateServings,
}: {
	recipe: ExpandedRecipe;
	numberOfServings: number;
	ingredientMap: IngredientMap;
	updateSelection: (ingId: string, newValue: boolean) => void;
	updateServings: (newServings: number) => void;
}) => {
	const recipeServingsMultiplier =
		numberOfServings / (recipe.number_of_servings || 1);

	return (
		<View className="gap-2 rounded-lg p-4">
			<View className="flex-row items-center justify-between">
				<Text className="text-lg font-semibold flex-1">{recipe.name}</Text>
				<View className="flex-row items-center gap-2">
					<Button
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onPress={() => {
							updateServings(Math.max(1, numberOfServings - 1));
						}}
					>
						<Minus className="h-3 w-3" />
					</Button>
					<Text className="min-w-[30px] text-center">{numberOfServings}</Text>
					<Button
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onPress={() => {
							updateServings(numberOfServings + 1);
						}}
					>
						<Plus className="h-3 w-3" />
					</Button>
				</View>
			</View>

			{recipe.ingredients?.map((ing) => {
				const scaledServings =
					(ing.number_of_servings || 1) * recipeServingsMultiplier;
				const servingDesc = ing.serving
					? getServingDescription(scaledServings, ing.serving)
					: null;

				return (
					<View key={ing.id} className="flex-row items-center gap-2">
						<Checkbox
							checked={ingredientMap[ing.id]}
							onCheckedChange={() => {
								updateSelection(ing.id, !ingredientMap[ing.id]);
							}}
						/>
						<View className="flex-1 flex-row flex-wrap gap-1">
							{servingDesc && <Text className="font-bold">{servingDesc}</Text>}
							<Text>{ing.food?.food_name || "Unknown"}</Text>
						</View>
					</View>
				);
			})}
		</View>
	);
};

// Memoize to prevent unnecessary re-renders when parent state changes
export default React.memo(RecipeCheckList);
