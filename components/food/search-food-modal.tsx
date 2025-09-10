import React, { useState, useEffect, useRef } from "react";
import {
	Modal,
	View,
	ScrollView,
	Platform,
	TouchableOpacity,
	ActivityIndicator,
} from "react-native";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { TriggerRef } from "@rn-primitives/select";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFatSecretFoodSearch } from "@/hooks/fat-secret/use-fat-secret-food-search";
import type {
	FatSecretFood,
	FatSecretServing,
} from "@/lib/server/fat-secret/types";

interface FoodItemToAdd {
	food: FatSecretFood;
	serving: FatSecretServing;
	amount: number;
}

interface SearchFoodModalProps {
	visible: boolean;
	onClose: () => void;
	addFoodItem: (item: FoodItemToAdd) => void;
}

interface FoodItemRowProps {
	food: FatSecretFood;
	onAdd: (item: FoodItemToAdd) => void;
}

const FoodItemRow: React.FC<FoodItemRowProps> = ({ food, onAdd }) => {
	const [amount, setAmount] = useState("1");
	const [selectedServingId, setSelectedServingId] = useState(
		String(food.servings.serving[0]?.serving_id || ""),
	);
	const selectTriggerRef = useRef<TriggerRef>(null);
	const insets = useSafeAreaInsets();

	const selectedServing =
		food.servings.serving.find(
			(serving) => String(serving.serving_id) === selectedServingId,
		) || food.servings.serving[0];

	const contentInsets = {
		top: insets.top,
		bottom: Platform.select({
			ios: insets.bottom,
			android: insets.bottom + 24,
		}),
		left: 12,
		right: 12,
	};

	const handleAdd = () => {
		const numericAmount = parseFloat(amount) || 1;
		onAdd({
			food,
			serving: selectedServing,
			amount: numericAmount,
		});
	};

	return (
		<View className="border-b border-border p-4">
			<Text className="font-semibold text-lg mb-2">{food.food_name}</Text>
			{food.brand_name && (
				<Text className="text-muted-foreground mb-2">{food.brand_name}</Text>
			)}

			<View className="flex-row items-center space-x-2 mb-3">
				<View className="flex-1">
					<Text className="text-sm font-medium mb-1">Amount</Text>
					<Input
						value={amount}
						onChangeText={setAmount}
						placeholder="1"
						keyboardType="numeric"
						className="h-8"
					/>
				</View>

				<View className="flex-2">
					<Text className="text-sm font-medium mb-1">Serving</Text>
					<Select
						value={{
							value: selectedServingId,
							label: selectedServing?.serving_description || "",
						}}
						onValueChange={(option) =>
							setSelectedServingId(option?.value || "")
						}
					>
						<SelectTrigger className="w-[180px]" ref={selectTriggerRef}>
							<SelectValue placeholder="Select serving" className="text-sm" />
						</SelectTrigger>
						<SelectContent insets={contentInsets}>
							<SelectGroup>
								<SelectLabel>Servings</SelectLabel>
								{food.servings.serving.map((serving) => (
									<SelectItem
										key={serving.serving_id}
										value={String(serving.serving_id)}
										label={serving.serving_description}
									>
										{serving.serving_description}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</View>
			</View>

			<View className="flex-row items-center justify-between">
				<View className="flex-row space-x-4">
					<Text className="text-sm">
						<Text className="font-medium">Calories:</Text>{" "}
						{Math.round(selectedServing.calories * parseFloat(amount || "1"))}
					</Text>
					<Text className="text-sm">
						<Text className="font-medium">Protein:</Text>{" "}
						{Math.round(selectedServing.protein * parseFloat(amount || "1"))}g
					</Text>
					<Text className="text-sm">
						<Text className="font-medium">Carbs:</Text>{" "}
						{Math.round(
							selectedServing.carbohydrate * parseFloat(amount || "1"),
						)}
						g
					</Text>
					<Text className="text-sm">
						<Text className="font-medium">Fat:</Text>{" "}
						{Math.round(selectedServing.fat * parseFloat(amount || "1"))}g
					</Text>
				</View>

				<Button onPress={handleAdd} size="sm">
					<Text>Add</Text>
				</Button>
			</View>
		</View>
	);
};

export const SearchFoodModal: React.FC<SearchFoodModalProps> = ({
	visible,
	onClose,
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
		// Optionally close modal after adding
		// onClose();
	};

	return (
		<Modal
			visible={visible}
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
						autoFocus
					/>
				</View>

				{/* Results */}
				<ScrollView className="flex-1">
					{isLoading && debouncedQuery && (
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
						debouncedQuery &&
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
