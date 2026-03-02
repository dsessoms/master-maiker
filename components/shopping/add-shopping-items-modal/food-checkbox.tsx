import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ExpandedFood } from "./types";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { getServingDescription } from "@/lib/utils/serving-description";

export const FoodCheckbox = ({
	food,
	servingId,
	numberOfServings,
	included,
	updateIncluded,
}: {
	food: ExpandedFood;
	servingId: string;
	numberOfServings: number;
	included: boolean;
	updateIncluded: (newValue: boolean) => void;
}) => {
	const serving = food.serving.find((s) => s.id === servingId);
	const servingDescription = serving
		? getServingDescription(numberOfServings, serving, food)
		: null;

	return (
		<View className="flex-row items-center gap-2 rounded-md bg-card p-3">
			<Checkbox
				checked={included}
				onCheckedChange={() => updateIncluded(!included)}
			/>
			<View className="flex-1 flex-row flex-wrap gap-1">
				{servingDescription && (
					<Text className="font-bold">{servingDescription}</Text>
				)}
				<Text>{food.food_name}</Text>
			</View>
		</View>
	);
};

// Memoize to prevent unnecessary re-renders when parent state changes
export default React.memo(FoodCheckbox);
