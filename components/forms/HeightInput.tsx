import React, { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { View } from "react-native";

interface HeightInputProps {
	totalInches: number;
	onHeightChange: (totalInches: number) => void;
}

export function HeightInput({ totalInches, onHeightChange }: HeightInputProps) {
	// Use local state to track user input without constant recalculation
	const [feetInput, setFeetInput] = useState("");
	const [inchesInput, setInchesInput] = useState("");

	// Initialize inputs when totalInches changes from outside
	useEffect(() => {
		if (totalInches > 0) {
			const feet = Math.floor(totalInches / 12);
			const inches = totalInches % 12;
			setFeetInput(feet.toString());
			setInchesInput(inches.toString());
		} else {
			setFeetInput("");
			setInchesInput("");
		}
	}, [totalInches]);

	const calculateAndUpdate = (newFeetInput: string, newInchesInput: string) => {
		const feet = parseInt(newFeetInput) || 0;
		const inches = parseFloat(newInchesInput) || 0;

		// Ensure inches don't exceed 11.99
		const clampedInches = Math.min(11.99, Math.max(0, inches));
		const newTotalInches = feet * 12 + clampedInches;

		onHeightChange(newTotalInches);
	};

	const handleFeetChange = (value: string) => {
		setFeetInput(value);
		calculateAndUpdate(value, inchesInput);
	};

	const handleInchesChange = (value: string) => {
		setInchesInput(value);
		calculateAndUpdate(feetInput, value);
	};

	return (
		<View className="gap-y-2">
			<Label>Height</Label>
			<View className="flex-row gap-x-3">
				<View className="flex-1">
					<Label>Feet</Label>
					<Input
						placeholder="0"
						value={feetInput}
						onChangeText={handleFeetChange}
						keyboardType="numeric"
					/>
				</View>
				<View className="flex-1">
					<Label>Inches</Label>
					<Input
						placeholder="0"
						value={inchesInput}
						onChangeText={handleInchesChange}
						keyboardType="numeric"
					/>
				</View>
			</View>
		</View>
	);
}
