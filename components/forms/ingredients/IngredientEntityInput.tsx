import type {
	FatSecretFood,
	FatSecretServing,
} from "@/lib/server/fat-secret/types";
import { Pressable, TextInput, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

import { EditableFatSecretFoodItem } from "@/components/food/editable-fat-secret-food-item";
import { Input } from "../../ui/input";
import { Search } from "@/lib/icons/search";
import { SearchFoodModal } from "@/components/food/search-food-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "@/lib/icons/x";
import { useFatSecretFood } from "@/hooks/fat-secret/use-fat-secret-food";

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
	onMultipleIngredientsPaste?: (ingredients: string[]) => void; // For handling pasted ingredient lists
	renderParsed?: (parsed: T) => React.ReactNode;
	shouldFocus?: boolean;
	onFocus?: () => void;
	editingFatSecretId?: number; // For editing existing fat secret foods
}

export function EntityInput<T>({
	value,
	onChange,
	onSave,
	onEdit,
	onCancel,
	onClear,
	onFoodSelect,
	onMultipleIngredientsPaste,
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

	const handleFoodDelete = () => {
		setSelectedFood(null);
		setIsEditingFood(false);
		// Clear the input value when deleting
		onClear?.();
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
				onDelete={onClear ? handleFoodDelete : undefined}
			/>
		);
	}

	if (value.state === EntityInputState.Parsed && value.parsed) {
		if (renderParsed) {
			return (
				<Pressable
					onPress={onEdit}
					className="min-h-[40px] rounded mb-2 w-full flex-row items-center px-2"
				>
					{renderParsed(value.parsed)}
				</Pressable>
			);
		}
		return null;
	}
	return (
		<View className="relative w-full">
			<Input
				ref={inputRef}
				placeholder={placeholder}
				value={value.raw}
				multiline
				onChange={(e) => {
					const inputType = (e.nativeEvent as any)?.inputType;
					const newText = e.nativeEvent.text;

					// Check if this is a paste operation with multiple lines
					if (inputType === "insertFromPaste" && onMultipleIngredientsPaste) {
						// Split by newlines and filter out empty lines
						const ingredientLines = newText
							.split(/\r?\n/)
							.map((line) => line.trim())
							.filter((line) => line.length > 0);

						// If multiple lines were pasted, handle as multiple ingredients
						if (ingredientLines.length > 1) {
							onMultipleIngredientsPaste(ingredientLines);
							return; // Don't call the regular onChange
						}
					}

					// Call the regular onChange for single-line content
					onChange(newText);
				}}
				onKeyPress={(e) => {
					// Detect Enter key press and save the ingredient
					if (e.nativeEvent.key === "Enter" && value.raw.trim()) {
						e.preventDefault(); // Prevent the newline from being inserted
						shouldSaveOnBlur.current = false; // Reset flag since we're saving immediately
						onSave();
					}
				}}
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
				className="overflow-hidden max-h-[40px] text-start"
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
					className="absolute right-10 top-0 bottom-0 w-8 justify-center items-center z-10"
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
					className="absolute right-2 top-0 bottom-0 w-8 justify-center items-center z-10"
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
