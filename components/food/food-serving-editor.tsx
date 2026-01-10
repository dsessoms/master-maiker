import type {
	FatSecretFood,
	FatSecretServing,
} from "@/lib/server/fat-secret/types";
import { Platform, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

import { Input } from "../ui/input";
import { Macros } from "@/components/meal-plan/macros";
import { Text } from "../ui/text";
import type { TriggerRef } from "@rn-primitives/select";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Utility function for rounding
const round = (value: number, precision: number = 2): number => {
	const factor = Math.pow(10, precision);
	return Math.round(value * factor) / factor;
};

interface FoodServingEditorProps {
	food: FatSecretFood;
	initialServing?: FatSecretServing;
	initialAmount?: number;
	onServingChange?: (serving: FatSecretServing, amount: number) => void;
	showMacros?: boolean;
	children?: React.ReactNode; // For action buttons or other custom content
}

export const FoodServingEditor: React.FC<FoodServingEditorProps> = ({
	food,
	initialServing,
	initialAmount = 1,
	onServingChange,
	showMacros = true,
	children,
}) => {
	const [numberOfServings, setNumberOfServings] = useState(initialAmount);
	const [selectedServingId, setSelectedServingId] = useState(
		String(
			initialServing?.serving_id || food.servings.serving[0]?.serving_id || "",
		),
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

	// Notify parent when serving or amount changes
	useEffect(() => {
		onServingChange?.(selectedServing, numberOfServings);
	}, [selectedServing, numberOfServings, onServingChange]);

	const onNumberOfUnitsChange = (value: string) => {
		setNumberOfUnits(value);
		const newNumberOfServings = round(
			Number(value || 0) / selectedServing.number_of_units,
			5,
		);
		setNumberOfServings(newNumberOfServings);
	};

	return (
		<>
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
								food.food_type === "Generic"
									? selectedServing?.measurement_description || ""
									: selectedServing?.serving_description || "",
						}}
						onValueChange={(option) =>
							setSelectedServingId(option?.value || "")
						}
					>
						<SelectTrigger ref={selectTriggerRef}>
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

				{children}
			</View>

			{showMacros && (
				<Macros
					calories={selectedServing.calories}
					carbohydrate={selectedServing.carbohydrate}
					protein={selectedServing.protein}
					fat={selectedServing.fat}
					scale={numberOfServings}
				/>
			)}
		</>
	);
};
