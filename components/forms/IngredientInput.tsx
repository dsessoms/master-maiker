import { Pressable, TextInput, View, Platform } from "react-native";
import React, { useEffect, useRef, useState } from "react";

import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	interpolate,
} from "react-native-reanimated";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import type { TriggerRef } from "@rn-primitives/select";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "@/lib/icons/x";
import { Search } from "@/lib/icons/search";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchFoodModal } from "@/components/food/search-food-modal";
import { Macros } from "@/components/meal-plan/macros";
import { useFatSecretFood } from "@/hooks/fat-secret/use-fat-secret-food";
import type {
	FatSecretFood,
	FatSecretServing,
} from "@/lib/server/fat-secret/types";

// Utility function for rounding
const round = (value: number, precision: number = 2): number => {
	const factor = Math.pow(10, precision);
	return Math.round(value * factor) / factor;
};

// Food data interfaces
export interface FoodData {
	food: FatSecretFood;
	serving: FatSecretServing;
	amount: number; // number of servings
	originalName?: string; // the original text that was typed
	fat_secret_id: number; // Fat Secret food ID for reloading
}

export enum EntityInputState {
	New = "new",
	Dirty = "dirty",
	Parsing = "parsing",
	Parsed = "parsed",
	Editing = "editing",
}

export type EntityInputValue<T> =
	| {
			state:
				| EntityInputState.New
				| EntityInputState.Dirty
				| EntityInputState.Parsing;
			raw: string;
			parsed?: T;
	  }
	| {
			state: EntityInputState.Parsed | EntityInputState.Editing;
			raw: string;
			parsed: T;
	  };

export interface EntityInputProps<T> {
	value: {
		state: EntityInputState;
		raw: string;
		parsed?: T;
	};
	placeholder?: string;
	onChange: (rawValue: string) => void;
	onSave: () => void;
	onEdit: () => void;
	onCancel?: () => void;
	onClear?: () => void;
	onFoodSelect?: (foodData: FoodData) => void;
	renderParsed?: (parsed: T) => React.ReactNode;
	shouldFocus?: boolean;
	onFocus?: () => void;
	editingFatSecretId?: number; // For editing existing fat secret foods
}

// EditableFoodItem component for editing selected foods
interface EditableFatSecretFoodItemProps {
	foodData: FoodData;
	onSave: (updatedFoodData: FoodData) => void;
	onCancel: () => void;
}

const EditableFatSecretFoodItem: React.FC<EditableFatSecretFoodItemProps> = ({
	foodData,
	onSave,
	onCancel,
}) => {
	const [numberOfServings, setNumberOfServings] = useState(foodData.amount);
	const [selectedServingId, setSelectedServingId] = useState(
		String(foodData.serving.serving_id),
	);
	const [numberOfUnits, setNumberOfUnits] = useState("1");
	const selectTriggerRef = useRef<TriggerRef>(null);
	const insets = useSafeAreaInsets();

	const selectedServing =
		foodData.food.servings.serving.find(
			(serving) => String(serving.serving_id) === selectedServingId,
		) || foodData.food.servings.serving[0];

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

	const handleSave = () => {
		onSave({
			...foodData,
			serving: selectedServing,
			amount: numberOfServings,
		});
	};

	const foodName = `${foodData.food.food_name}${
		foodData.food.brand_name ? ` (${foodData.food.brand_name})` : ""
	}`;

	return (
		<View className="space-y-2 p-2 border border-border rounded-lg">
			<View className="flex-1">
				{foodData.originalName && (
					<Text className="text-sm text-muted-foreground mb-1">
						{foodData.originalName}
					</Text>
				)}
				<Text className="text-lg font-semibold">{foodName}</Text>
			</View>

			<View className="flex-row items-center space-x-2">
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
								foodData.food.food_type === "Generic"
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
								{foodData.food.servings.serving.map((serving) => (
									<SelectItem
										key={serving.serving_id}
										value={String(serving.serving_id)}
										label={
											foodData.food.food_type === "Generic"
												? serving.measurement_description
												: serving.serving_description
										}
									>
										{foodData.food.food_type === "Generic"
											? serving.measurement_description
											: serving.serving_description}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</View>
			</View>

			<Macros
				calories={selectedServing.calories}
				carbohydrate={selectedServing.carbohydrate}
				protein={selectedServing.protein}
				fat={selectedServing.fat}
				scale={numberOfServings}
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

export function EntityInput<T>({
	value,
	onChange,
	onSave,
	onEdit,
	onCancel,
	onClear,
	onFoodSelect,
	renderParsed,
	placeholder,
	shouldFocus,
	onFocus,
	editingFatSecretId,
}: EntityInputProps<T>) {
	const inputRef = useRef<TextInput>(null);
	const shouldSaveOnBlur = useRef(false);
	const isDeleting = useRef(false);
	const isSearching = useRef(false);
	const pulseAnimation = useSharedValue(0);
	const [showSearchModal, setShowSearchModal] = useState(false);
	const [selectedFood, setSelectedFood] = useState<FoodData | null>(null);
	const [isEditingFood, setIsEditingFood] = useState(false);

	// Helper function to handle blur logic with conditional saving
	const handleBlur = () => {
		shouldSaveOnBlur.current = true;

		setTimeout(() => {
			if (
				shouldSaveOnBlur.current &&
				!isDeleting.current &&
				!isSearching.current
			) {
				onSave();
			}
			shouldSaveOnBlur.current = false;
		}, 50);
	};

	// Load fat secret food when editingFatSecretId is provided
	const { food: fatSecretFood, isLoading: isLoadingFatSecretFood } =
		useFatSecretFood(editingFatSecretId ? String(editingFatSecretId) : "");

	// Set up editing when fat secret food is loaded
	useEffect(() => {
		if (editingFatSecretId && fatSecretFood && value.parsed && !isEditingFood) {
			const ingredient = value.parsed as any; // assuming it's an Ingredient type

			// Find the matching serving by fat_secret_id
			const matchingServing =
				fatSecretFood.servings.serving.find(
					(serving: FatSecretServing) =>
						serving.serving_id === ingredient.serving?.fat_secret_id,
				) || fatSecretFood.servings.serving[0];

			const foodData: FoodData = {
				food: fatSecretFood,
				serving: matchingServing,
				amount: ingredient.number_of_servings || 1,
				originalName: ingredient.meta || undefined,
				fat_secret_id: editingFatSecretId,
			};

			setSelectedFood(foodData);
			setIsEditingFood(true);
		}
	}, [editingFatSecretId, fatSecretFood, value.parsed, isEditingFood]);

	const handleFoodSelect = (foodItem: any) => {
		// Convert SearchFoodModal item to FoodData format
		const foodData: FoodData = {
			food: foodItem.food,
			serving: foodItem.serving,
			amount: foodItem.amount,
			originalName: value.raw || undefined,
			fat_secret_id: foodItem.food.food_id,
		};

		// Move directly to parsed state instead of editing state
		if (onFoodSelect) {
			onFoodSelect(foodData);
		}
		setShowSearchModal(false);
	};

	const handleFoodSave = (updatedFoodData: FoodData) => {
		if (onFoodSelect) {
			onFoodSelect(updatedFoodData);
		}
		setSelectedFood(null);
		setIsEditingFood(false);
	};

	const handleFoodCancel = () => {
		setSelectedFood(null);
		setIsEditingFood(false);
		// Call the parent's onCancel to reset the editing state
		onCancel?.();
	};

	useEffect(() => {
		if (value.state === EntityInputState.Parsing) {
			pulseAnimation.value = withRepeat(
				withTiming(1, { duration: 350 }),
				-1,
				true,
			);
		} else {
			pulseAnimation.value = 0;
		}
	}, [value.state]);

	const animatedStyle = useAnimatedStyle(() => {
		const opacity = interpolate(pulseAnimation.value, [0, 1], [0.3, 0.7]);
		return {
			opacity,
		};
	});

	useEffect(() => {
		if (inputRef.current && value.state === EntityInputState.Editing) {
			inputRef.current.focus();
			// Small delay to ensure the input is properly focused before scrolling
			setTimeout(() => {
				inputRef.current?.measureInWindow((x, y, width, height) => {
					// This helps ensure the input is visible when focused
				});
			}, 100);
		}
	}, [value.state]);

	useEffect(() => {
		if (inputRef.current && shouldFocus) {
			inputRef.current.focus();
			// Small delay to ensure the input is properly focused before scrolling
			setTimeout(() => {
				inputRef.current?.measureInWindow((x, y, width, height) => {
					// This helps ensure the input is visible when focused
				});
			}, 100);
			onFocus?.();
		}
	}, [shouldFocus, onFocus]);

	if (value.state === EntityInputState.Parsing || isLoadingFatSecretFood) {
		return <Skeleton className="h-[40px] w-full rounded-full" />;
	}

	// Show EditableFoodItem when editing a selected food
	if (isEditingFood && selectedFood) {
		return (
			<EditableFatSecretFoodItem
				foodData={selectedFood}
				onSave={handleFoodSave}
				onCancel={handleFoodCancel}
			/>
		);
	}

	if (value.state === EntityInputState.Parsed && value.parsed) {
		if (renderParsed) {
			return (
				<Pressable
					onPress={onEdit}
					style={{
						minHeight: 40,
						borderRadius: 4,
						marginBottom: 8,
						width: "100%",
						flexDirection: "row",
						alignItems: "center",
						paddingHorizontal: 8,
					}}
				>
					{renderParsed(value.parsed)}
				</Pressable>
			);
		}
		return null;
	}
	return (
		<View style={{ position: "relative", width: "100%" }}>
			<Input
				ref={inputRef}
				placeholder={placeholder}
				value={value.raw}
				onChangeText={onChange}
				onSubmitEditing={() => {
					shouldSaveOnBlur.current = false; // Reset flag since we're saving immediately
					onSave();
				}}
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="done"
				onFocus={() => {
					shouldSaveOnBlur.current = false;
				}}
				onBlur={handleBlur}
				style={{
					paddingRight: onFoodSelect
						? value.raw
							? 80
							: 48 // Both icons or just search icon
						: value.raw
							? 40
							: 12, // Just clear icon or no icons
				}}
			/>
			{!!value.raw && !!onClear && (
				<Pressable
					onPressIn={() => {
						isDeleting.current = true;
					}}
					onFocus={() => {
						shouldSaveOnBlur.current = false;
					}}
					onBlur={handleBlur}
					onPress={() => {
						onClear();
					}}
					style={{
						position: "absolute",
						right: 40,
						top: 0,
						bottom: 0,
						width: 32,
						justifyContent: "center",
						alignItems: "center",
						zIndex: 1,
					}}
					hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
				>
					<X size={16} className="text-muted-foreground" />
				</Pressable>
			)}
			{!!onFoodSelect && (
				<Pressable
					onPressIn={() => {
						isSearching.current = true;
						shouldSaveOnBlur.current = false;
					}}
					onFocus={() => {
						shouldSaveOnBlur.current = false;
					}}
					onBlur={handleBlur}
					onPress={() => {
						setShowSearchModal(true);
					}}
					style={{
						position: "absolute",
						right: 8,
						top: 0,
						bottom: 0,
						width: 32,
						justifyContent: "center",
						alignItems: "center",
						zIndex: 1,
					}}
					hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
				>
					<Search size={16} className="text-muted-foreground" />
				</Pressable>
			)}
			{!!onFoodSelect && (
				<SearchFoodModal
					visible={showSearchModal}
					onDismiss={() => {
						shouldSaveOnBlur.current = false;
						isSearching.current = false;
						inputRef.current?.focus();
					}}
					onClose={() => {
						setShowSearchModal(false);
					}}
					addFoodItem={handleFoodSelect}
				/>
			)}
		</View>
	);
}
