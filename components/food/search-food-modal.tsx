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
import { Macros } from "@/components/meal-plan/macros";

// Utility function for rounding
const round = (value: number, precision: number = 2): number => {
	const factor = Math.pow(10, precision);
	return Math.round(value * factor) / factor;
};

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
	const [numberOfServings, setNumberOfServings] = useState(1);
	const [selectedServingId, setSelectedServingId] = useState(
		String(food.servings.serving[0]?.serving_id || ""),
	);
	const [numberOfUnits, setNumberOfUnits] = useState("1");
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

	// Update numberOfUnits when selectedServing or numberOfServings changes
	useEffect(() => {
		setNumberOfUnits(
			String(numberOfServings * selectedServing.number_of_units),
		);
	}, [selectedServing, numberOfServings]);

	const onNumberOfUnitsChange = (value: string) => {
		setNumberOfUnits(value);
		const newNumberOfServings = round(
			Number(value || 0) / selectedServing.number_of_units,
			5,
		);
		setNumberOfServings(newNumberOfServings);
	};

	const handleAdd = () => {
		onAdd({
			food,
			serving: selectedServing,
			amount: numberOfServings,
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

			<View className="flex-row items-center space-x-2 mb-3">
				<View className="w-24">
					<Input
						value={numberOfUnits}
						onChangeText={onNumberOfUnitsChange}
						placeholder="1"
						keyboardType="numeric"
						className="h-10 text-center"
						selectTextOnFocus={true}
					/>
				</View>

				<View className="flex-1">
					<Select
						value={{
							value: selectedServingId,
							label:
								food.food_type === "Generic"
									? selectedServing?.measurement_description || ""
									: selectedServing?.serving_description || "",
						}}
						onValueChange={(option) =>
							setSelectedServingId(option?.value || "")
						}
					>
						<SelectTrigger className="h-10" ref={selectTriggerRef}>
							<SelectValue placeholder="Select serving" className="text-sm" />
						</SelectTrigger>
						<SelectContent insets={contentInsets}>
							<SelectGroup>
								<SelectLabel>Servings</SelectLabel>
								{food.servings.serving.map((serving) => (
									<SelectItem
										key={serving.serving_id}
										value={String(serving.serving_id)}
										label={
											food.food_type === "Generic"
												? serving.measurement_description
												: serving.serving_description
										}
									>
										{food.food_type === "Generic"
											? serving.measurement_description
											: serving.serving_description}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</View>

				<Button onPress={handleAdd} size="sm" className="h-10">
					<Text>Add</Text>
				</Button>
			</View>

			<Macros
				calories={selectedServing.calories}
				carbohydrate={selectedServing.carbohydrate}
				protein={selectedServing.protein}
				fat={selectedServing.fat}
				scale={numberOfServings}
			/>
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
		// Optionally close modal after adding
		// onClose();
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
