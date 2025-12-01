import { Check, Plus } from "@/lib/icons";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Text } from "../ui/text";
import { View } from "react-native";
import { useState } from "react";

interface AddNoteProps {
	onAdd: (value: string, isCheckbox: boolean) => void;
}

export const AddNote = ({ onAdd }: AddNoteProps) => {
	const [isAdding, setIsAdding] = useState(false);
	const [value, setValue] = useState("");
	const [isCheckbox, setIsCheckbox] = useState(false);

	const handleAdd = () => {
		if (value.trim()) {
			onAdd(value.trim(), isCheckbox);
			setValue("");
			setIsCheckbox(false);
			setIsAdding(false);
		}
	};

	const handleCancel = () => {
		setValue("");
		setIsCheckbox(false);
		setIsAdding(false);
	};

	if (!isAdding) {
		return (
			<Button
				size="sm"
				variant="ghost"
				onPress={() => setIsAdding(true)}
				className="self-start"
			>
				<Plus className="h-4 w-4" />
				<Text>Add note</Text>
			</Button>
		);
	}

	return (
		<View className="flex flex-col gap-2 p-2 bg-muted rounded-lg">
			<View className="flex flex-row items-center gap-2">
				<Input
					value={value}
					onChangeText={setValue}
					placeholder="Enter note..."
					className="flex-1"
					autoFocus
					onSubmitEditing={handleAdd}
				/>
			</View>
			<View className="flex flex-row items-center justify-between">
				<View className="flex flex-row items-center gap-2">
					<Checkbox
						checked={isCheckbox}
						onCheckedChange={(checked) => setIsCheckbox(checked === true)}
					/>
					<Text className="text-sm text-muted-foreground">
						Make it a checkbox
					</Text>
				</View>
				<View className="flex flex-row gap-2">
					<Button size="sm" variant="ghost" onPress={handleCancel}>
						<Text>Cancel</Text>
					</Button>
					<Button size="sm" onPress={handleAdd} disabled={!value.trim()}>
						<Check className="h-4 w-4" />
						<Text>Add</Text>
					</Button>
				</View>
			</View>
		</View>
	);
};
