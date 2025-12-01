import React, { useState } from "react";
import { useNotes, useUpdateNote } from "@/hooks/notes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NotesModal } from "./notes-modal";
import { PencilIcon } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

interface Note {
	id: string;
	value: string;
	is_checkbox: boolean;
	is_checked: boolean;
	display_order: number;
}

interface NotesListProps {
	date: string;
	mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
}

export const NotesList = ({ date, mealType }: NotesListProps) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const { notes = [] } = useNotes({
		noteType: "day_meal",
		date,
		mealType,
	});
	const updateNote = useUpdateNote();

	const handleCheckboxToggle = (noteId: string, currentChecked: boolean) => {
		updateNote.mutate({
			noteId,
			isChecked: !currentChecked,
		});
	};

	// Don't render if no notes
	if (notes.length === 0) {
		return null;
	}

	return (
		<>
			<View className="mb-3 rounded-lg bg-card p-3">
				<View className="flex-row items-center justify-between mb-2">
					<Text className="text-sm font-medium text-muted-foreground">
						Notes
					</Text>
					<Button
						variant="ghost"
						size="icon"
						onPress={() => setIsModalVisible(true)}
						className="h-8 w-8"
					>
						<PencilIcon className="text-muted-foreground" size={18} />
					</Button>
				</View>
				{notes.map((note: Note) => (
					<View key={note.id} className="flex-row items-start mb-2 gap-2">
						<Checkbox
							checked={note.is_checked}
							onCheckedChange={() =>
								handleCheckboxToggle(note.id, note.is_checked)
							}
							className="mt-1"
						/>
						<Text
							className={
								note.is_checked
									? "text-muted-foreground line-through flex-1"
									: "flex-1"
							}
						>
							{note.value}
						</Text>
					</View>
				))}
			</View>
			<NotesModal
				isVisible={isModalVisible}
				toggleIsVisible={() => setIsModalVisible(false)}
				date={date}
				mealType={mealType}
			/>
		</>
	);
};
