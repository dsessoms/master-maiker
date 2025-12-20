import { Check, PencilIcon, Trash2Icon, X } from "@/lib/icons";
import { Pressable, View } from "react-native";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Note } from "@/lib/schemas/note-schema";
import { Text } from "../ui/text";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NoteItemProps {
	note: Note;
	onUpdate: (
		noteId: string,
		updates: { value?: string; isChecked?: boolean },
	) => void;
	onDelete: (noteId: string) => void;
}

export const NoteItem = ({ note, onUpdate, onDelete }: NoteItemProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(note.value);

	const handleSave = () => {
		if (editValue.trim() && editValue !== note.value) {
			onUpdate(note.id, { value: editValue.trim() });
		}
		setIsEditing(false);
	};

	const handleCancel = () => {
		setEditValue(note.value);
		setIsEditing(false);
	};

	const handleCheckboxToggle = () => {
		onUpdate(note.id, { isChecked: !note.is_checked });
	};

	if (isEditing) {
		return (
			<View className="flex flex-row items-center gap-2 p-2 bg-muted rounded-lg">
				<Input
					value={editValue}
					onChangeText={setEditValue}
					className="flex-1"
					autoFocus
					onSubmitEditing={handleSave}
				/>
				<Button
					size="icon"
					variant="ghost"
					onPress={handleSave}
					className="h-8 w-8"
				>
					<Check className="h-4 w-4 text-green-600" />
				</Button>
				<Button
					size="icon"
					variant="ghost"
					onPress={handleCancel}
					className="h-8 w-8"
				>
					<X className="h-4 w-4 text-red-600" />
				</Button>
			</View>
		);
	}

	return (
		<View className="flex flex-row items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
			{note.is_checkbox && (
				<Pressable onPress={handleCheckboxToggle}>
					<Checkbox
						checked={note.is_checked}
						onCheckedChange={handleCheckboxToggle}
					/>
				</Pressable>
			)}
			<Text
				className={cn(
					"flex-1 text-sm",
					note.is_checkbox && note.is_checked && "line-through opacity-60",
				)}
			>
				{note.value}
			</Text>
			<Button
				size="icon"
				variant="ghost"
				onPress={() => setIsEditing(true)}
				className="h-8 w-8"
			>
				<PencilIcon className="h-3 w-3" />
			</Button>
			<Button
				size="icon"
				variant="ghost"
				onPress={() => onDelete(note.id)}
				className="h-8 w-8"
			>
				<Trash2Icon className="h-3 w-3 text-destructive" />
			</Button>
		</View>
	);
};
