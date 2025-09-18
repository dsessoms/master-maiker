import {
	ActivityIndicator,
	Modal,
	Platform,
	ScrollView,
	View,
} from "react-native";
import type {
	FatSecretFood,
	FatSecretServing,
} from "@/lib/server/fat-secret/types";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FoodServingEditor } from "./food-serving-editor";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useFatSecretFoodSearch } from "@/hooks/fat-secret/use-fat-secret-food-search";

interface FoodItemToAdd {
	food: FatSecretFood;
	serving: FatSecretServing;
	amount: number; // This now represents numberOfServings
}

interface SearchFoodModalProps {
	visible: boolean;
	onClose: () => void;
	onDismiss?: () => void;
	addFoodItem: (item: FoodItemToAdd) => void;
}

interface FoodItemRowProps {
	food: FatSecretFood;
	onAdd: (item: FoodItemToAdd) => void;
}

const FoodItemRow: React.FC<FoodItemRowProps> = ({ food, onAdd }) => {
	const [currentServing, setCurrentServing] = useState(
		food.servings.serving[0],
	);
	const [currentAmount, setCurrentAmount] = useState(1);

	const handleServingChange = (serving: FatSecretServing, amount: number) => {
		setCurrentServing(serving);
		setCurrentAmount(amount);
	};

	const handleAdd = () => {
		onAdd({
			food,
			serving: currentServing,
			amount: currentAmount,
		});
	};

	const foodName = `${food.food_name}${
		food.brand_name ? ` (${food.brand_name})` : ""
	}`;

	return (
		<View className="border-b border-border p-4">
			<View className="flex-1 mb-2">
				<Text className="text-lg font-semibold mb-1">{foodName}</Text>
			</View>

			<View className="mb-3">
				<FoodServingEditor
					food={food}
					initialServing={food.servings.serving[0]}
					initialAmount={1}
					onServingChange={handleServingChange}
					showMacros={true}
				>
					<Button onPress={handleAdd} size="sm" className="h-10">
						<Text>Add</Text>
					</Button>
				</FoodServingEditor>
			</View>
		</View>
	);
};

export const SearchFoodModal: React.FC<SearchFoodModalProps> = ({
	visible,
	onClose,
	onDismiss,
	addFoodItem,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	const { searchResults, isLoading, error } =
		useFatSecretFoodSearch(debouncedQuery);

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleAddFood = (item: FoodItemToAdd) => {
		addFoodItem(item);
	};

	return (
		<Modal
			visible={visible}
			onDismiss={onDismiss}
			animationType="slide"
			presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
			onRequestClose={onClose}
		>
			<View className="flex-1 bg-background" nativeID="modal-content">
				{/* Header */}
				<View className="flex-row items-center justify-between p-4 border-b border-border">
					<Text className="text-xl font-semibold">Search Foods</Text>
					<Button variant="ghost" onPress={onClose}>
						<Text>Done</Text>
					</Button>
				</View>

				{/* Search Input */}
				<View className="p-4">
					<Input
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholder="Search for foods..."
						className="w-full"
					/>
				</View>

				{/* Results */}
				<ScrollView className="flex-1">
					{isLoading && !!debouncedQuery && (
						<View className="p-4 items-center">
							<ActivityIndicator size="large" />
							<Text className="mt-2 text-muted-foreground">Searching...</Text>
						</View>
					)}

					{!!error && (
						<View className="p-4 items-center">
							<Text className="text-destructive">
								Error searching for foods
							</Text>
						</View>
					)}

					{!isLoading &&
						!!debouncedQuery &&
						!searchResults?.foods_search?.results?.food?.length && (
							<View className="p-4 items-center">
								<Text className="text-muted-foreground">
									No foods found for "{debouncedQuery}"
								</Text>
							</View>
						)}

					{searchResults?.foods_search?.results?.food?.map((food) => (
						<FoodItemRow key={food.food_id} food={food} onAdd={handleAddFood} />
					))}

					{!debouncedQuery && (
						<View className="p-4 items-center">
							<Text className="text-muted-foreground">
								Start typing to search for foods
							</Text>
						</View>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
};
