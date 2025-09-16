import { Pressable, View } from "react-native";
import React, { useState } from "react";

import { Button } from "../ui/button";
import type { FatSecretServing } from "@/lib/server/fat-secret/types";
import { FoodData } from "@/components/forms/ingredients/ingredient-input";
import { FoodServingEditor } from "./food-serving-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "../ui/text";
import { X } from "@/lib/icons/x";
import { useFatSecretFood } from "@/hooks/fat-secret/use-fat-secret-food";

interface EditableFatSecretFoodItemProps {
	foodId: string;
	servingId: string;
	amount: number;
	onSave: (updatedFoodData: FoodData) => void;
	onCancel: () => void;
	onDelete?: () => void;
}

export const EditableFatSecretFoodItem: React.FC<
	EditableFatSecretFoodItemProps
> = ({ foodId, servingId, amount, onSave, onCancel, onDelete }) => {
	const { food, isLoading, error } = useFatSecretFood(String(foodId));

	// Find the matching serving by servingId or use the first one as default
	const getInitialServing = (): FatSecretServing | null => {
		if (!food?.servings?.serving) return null;
		return (
			food.servings.serving.find(
				(serving: FatSecretServing) => serving.serving_id === Number(servingId),
			) || food.servings.serving[0]
		);
	};

	const [currentServing, setCurrentServing] = useState<FatSecretServing | null>(
		null,
	);
	const [currentAmount, setCurrentAmount] = useState<number>(amount);

	// Update serving when food loads
	React.useEffect(() => {
		if (food && !currentServing) {
			setCurrentServing(getInitialServing());
		}
	}, [food, currentServing]);

	const handleServingChange = (
		serving: FatSecretServing,
		newAmount: number,
	) => {
		setCurrentServing(serving);
		setCurrentAmount(newAmount);
	};

	const handleSave = () => {
		if (!food || !currentServing) return;

		const foodData: FoodData = {
			food,
			serving: currentServing,
			amount: currentAmount,
			fat_secret_id: Number(foodId),
		};

		onSave(foodData);
	};

	if ((isLoading || !food || !currentServing) && !error) {
		return <Skeleton className="h-[120px] w-full rounded-lg" />;
	}

	if (error) {
		return (
			<View className="p-4 border border-destructive rounded-lg">
				<Text className="text-destructive">
					{error ? "Failed to load food data" : "Loading food data..."}
				</Text>
			</View>
		);
	}

	const foodName = `${food.food_name}${
		food.brand_name ? ` (${food.brand_name})` : ""
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
				food={food}
				initialServing={currentServing || undefined}
				initialAmount={currentAmount}
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
				<Button
					onPress={handleSave}
					size="sm"
					className="flex-1"
					disabled={!currentServing}
				>
					<Text>Save</Text>
				</Button>
			</View>
		</View>
	);
};
