import { FatSecretFood, FatSecretServing } from "@/lib/server/fat-secret/types";
import React, { useState } from "react";
import {
	StatefulInput,
	StatefulInputProps,
	StatefulInputState,
} from "@/components/forms/stateful-input/stateful-input";

import { EditableFatSecretFoodItem } from "@/components/food/editable-fat-secret-food-item";
import { Image } from "@/components/image";
import { Ingredient } from "@/lib/schemas";
import { KeyboardHint } from "@/components/ui/keyboard-hint";
import { Macros } from "@/components/meal-plan/macros";
import { SearchFoodModal } from "@/components/food/search-food-modal";
import { GripVertical, ShoppingBasket } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { Pressable, View } from "react-native";
import { getServingDescription } from "@/lib/utils/serving-description";
import Sortable from "react-native-sortables";

export interface FoodData {
	food: FatSecretFood;
	serving: FatSecretServing;
	amount: number; // number of servings
	originalName?: string; // the original text that was typed
	fat_secret_id: number; // Fat Secret food ID for reloading
}

export interface IngredientInputProps
	extends Omit<StatefulInputProps<Ingredient>, "onSearch"> {
	recipeServings: number;
	onFoodSelect: (foodData: FoodData) => void;
	onCancel: () => void;
}

export function IngredientInput({
	onFoodSelect,
	recipeServings,
	...props
}: IngredientInputProps) {
	const [showSearchModal, setShowSearchModal] = useState(false);

	const handleFoodSelect = (foodItem: any) => {
		// Convert SearchFoodModal item to FoodData format
		const foodData: FoodData = {
			food: foodItem.food,
			serving: foodItem.serving,
			amount: foodItem.amount,
			originalName: props.value.raw || undefined,
			fat_secret_id: foodItem.food.food_id,
		};

		// Move directly to parsed state instead of editing state
		onFoodSelect(foodData);
		setShowSearchModal(false);
	};

	const handleEditableFoodSave = (updatedFoodData: FoodData) => {
		// Update the ingredient value with the new food data
		onFoodSelect(updatedFoodData);
	};

	const handleEditableFoodCancel = () => {
		// This will revert to the parsed state by calling onCancel
		props.onCancel?.();
	};

	return (
		<View className="relative w-full">
			<StatefulInput<Ingredient>
				{...props}
				onSearch={() => setShowSearchModal(true)}
				renderParsed={(parsed, onEdit) => {
					const { name, number_of_servings, serving, image_url } = parsed;

					// Use the getServingDescription function for displaying serving info
					const servingDescription = getServingDescription(number_of_servings, {
						measurement_description: serving.measurement_description,
						number_of_units: serving.number_of_units,
					});

					// Calculate nutrition for the actual number of servings
					const totalCalories = serving.calories * number_of_servings;
					const totalCarbs = serving.carbohydrate_grams * number_of_servings;
					const totalProtein = serving.protein_grams * number_of_servings;
					const totalFat = serving.fat_grams * number_of_servings;

					// Calculate nutrition per recipe serving
					const caloriesPerServing = totalCalories / recipeServings;
					const carbsPerServing = totalCarbs / recipeServings;
					const proteinPerServing = totalProtein / recipeServings;
					const fatPerServing = totalFat / recipeServings;

					return (
						<View className="flex-1 min-h-[60px] bg-background rounded-md">
							<View className="flex-row py-2 items-center">
								{/* Thumbnail image or placeholder */}
								<Pressable onPress={onEdit} className="flex-1">
									<View className="flex-1 flex-row items-center">
										<View className="w-10 h-10 rounded-full mr-3 overflow-hidden justify-center items-center flex-shrink-0">
											{image_url ? (
												<Image
													source={{ uri: image_url }}
													className="w-[30px] h-[30px]"
													contentFit="contain"
												/>
											) : (
												<ShoppingBasket size={20} color="#666" />
											)}
										</View>

										<View className="flex-1 min-w-0">
											<View className="flex-row items-center flex-wrap mb-1">
												<Text className="font-bold text-base select-none">
													{servingDescription}
												</Text>
												<Text className="ml-2 text-base flex-shrink select-none">
													{name}
												</Text>
											</View>
											{parsed.meta && (
												<Text className="text-xs text-muted-foreground mb-1 select-none">
													{parsed.meta}
												</Text>
											)}
											<View>
												<Macros
													calories={caloriesPerServing}
													carbohydrate={carbsPerServing}
													protein={proteinPerServing}
													fat={fatPerServing}
												/>
											</View>
										</View>
									</View>
								</Pressable>
								<Sortable.Handle>
									<GripVertical size={20} color="#666" />
								</Sortable.Handle>
							</View>
						</View>
					);
				}}
				renderCustomEditor={
					props.value.parsed?.fat_secret_id
						? () => {
								const parsed = props.value.parsed!;
								return (
									<EditableFatSecretFoodItem
										foodId={String(parsed.fat_secret_id)}
										servingId={String(parsed.serving.fat_secret_id)}
										amount={parsed.number_of_servings}
										onSave={handleEditableFoodSave}
										onCancel={handleEditableFoodCancel}
									/>
								);
							}
						: undefined
				}
			/>
			<KeyboardHint
				keyLabel="enter"
				actionText="to save"
				show={
					props.value.state === StatefulInputState.Edit &&
					!props.value.parsed?.fat_secret_id
				}
			/>
			{!!onFoodSelect && (
				<SearchFoodModal
					visible={showSearchModal}
					onClose={() => {
						setShowSearchModal(false);
					}}
					addFoodItem={handleFoodSelect}
				/>
			)}
		</View>
	);
}
