import { Pressable, View } from "react-native";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { X } from "@/lib/icons/x";
import { FoodServingEditor } from "./food-serving-editor";
import type { FoodData } from "@/components/forms/IngredientInput";
import type { FatSecretServing } from "@/lib/server/fat-secret/types";

interface EditableFatSecretFoodItemProps {
	foodData: FoodData;
	onSave: (updatedFoodData: FoodData) => void;
	onCancel: () => void;
	onDelete?: () => void;
}

export const EditableFatSecretFoodItem: React.FC<
	EditableFatSecretFoodItemProps
> = ({ foodData, onSave, onCancel, onDelete }) => {
	const [currentServing, setCurrentServing] = useState(foodData.serving);
	const [currentAmount, setCurrentAmount] = useState(foodData.amount);

	const handleServingChange = (serving: FatSecretServing, amount: number) => {
		setCurrentServing(serving);
		setCurrentAmount(amount);
	};

	const handleSave = () => {
		onSave({
			...foodData,
			serving: currentServing,
			amount: currentAmount,
		});
	};

	const foodName = `${foodData.food.food_name}${
		foodData.food.brand_name ? ` (${foodData.food.brand_name})` : ""
	}`;

	return (
		<View className="space-y-2 p-2 border border-border rounded-lg">
			<View className="flex-row items-center justify-between">
				<Text className="text-lg font-semibold flex-1">{foodName}</Text>
				{onDelete && (
					<Pressable
						onPress={onDelete}
						className="p-1 rounded-full"
						hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
					>
						<X size={20} className="text-muted-foreground" />
					</Pressable>
				)}
			</View>

			<FoodServingEditor
				food={foodData.food}
				initialServing={foodData.serving}
				initialAmount={foodData.amount}
				onServingChange={handleServingChange}
				showMacros={true}
			/>

			<View className="flex-row space-x-2">
				<Button
					variant="outline"
					onPress={onCancel}
					size="sm"
					className="flex-1"
				>
					<Text>Cancel</Text>
				</Button>
				<Button onPress={handleSave} size="sm" className="flex-1">
					<Text>Save</Text>
				</Button>
			</View>
		</View>
	);
};
