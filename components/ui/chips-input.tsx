import { Pressable, View } from "react-native";
import React, { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { X } from "@/lib/icons";

interface Chip {
	id: string;
	value: string;
}

interface ChipsInputProps {
	label: string;
	placeholder?: string;
	chips: string[];
	onChipsChange: (chips: string[]) => void;
	disabled?: boolean;
}

export const ChipsInput = ({
	label,
	placeholder = "Type and press Enter",
	chips,
	onChipsChange,
	disabled = false,
}: ChipsInputProps) => {
	const [inputValue, setInputValue] = useState("");

	// Convert string array to chip objects for internal use
	const chipObjects: Chip[] = chips.map((chip, index) => ({
		id: `${chip}-${index}`,
		value: chip,
	}));

	const addChip = () => {
		const trimmedValue = inputValue.trim();
		if (trimmedValue && !chips.includes(trimmedValue)) {
			const newChips = [...chips, trimmedValue];
			onChipsChange(newChips);
			setInputValue("");
		}
	};

	const removeChip = (chipToRemove: string) => {
		const newChips = chips.filter((chip) => chip !== chipToRemove);
		onChipsChange(newChips);
	};

	const ChipComponent = ({ chip }: { chip: Chip }) => (
		<View className="flex-row items-center bg-secondary rounded-full px-3 py-1 gap-1">
			<Text className="text-sm">{chip.value}</Text>
			{!disabled && (
				<Pressable
					onPress={() => removeChip(chip.value)}
					className="ml-1 p-0.5"
				>
					<X size={12} className="text-muted-foreground" />
				</Pressable>
			)}
		</View>
	);

	return (
		<View className="gap-3">
			<Label>{label}</Label>
			{!disabled && (
				<Input
					placeholder={placeholder}
					value={inputValue}
					onChangeText={setInputValue}
					onSubmitEditing={addChip}
					returnKeyType="done"
				/>
			)}
			{chipObjects.length > 0 && (
				<View className="flex-row flex-wrap gap-2">
					{chipObjects.map((chip) => (
						<ChipComponent key={chip.id} chip={chip} />
					))}
				</View>
			)}
		</View>
	);
};
