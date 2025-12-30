import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ExpandedFood } from "./types";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

const getServingDescription = (
	numberOfServings: number,
	serving: {
		measurement_description: string | null;
		number_of_units: number | null;
	},
	foodType: string | null,
) => {
	if (!serving.number_of_units) {
		return {
			countString: numberOfServings.toString(),
			description: serving.measurement_description || "serving",
		};
	}

	const totalUnits = numberOfServings * serving.number_of_units;
	return {
		countString: totalUnits.toString(),
		description: serving.measurement_description || "unit",
	};
};

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
	const servingDetails = serving
		? getServingDescription(numberOfServings, serving, food.food_type)
		: null;

	return (
		<View className="flex-row items-center gap-2 rounded-md bg-card p-3">
			<Checkbox
				checked={included}
				onCheckedChange={() => updateIncluded(!included)}
			/>
			<View className="flex-1 flex-row flex-wrap gap-1">
				{servingDetails && (
					<>
						<Text className="font-bold">{servingDetails.countString}</Text>
						<Text className="font-bold">{servingDetails.description}</Text>
					</>
				)}
				<Text>{food.food_name}</Text>
			</View>
		</View>
	);
};

// Memoize to prevent unnecessary re-renders when parent state changes
export default React.memo(FoodCheckbox);
