import { EntityInput, EntityInputState } from "@/components/forms/entity-input";
import { Modal, ScrollView, View } from "react-native";
import React, { useEffect, useState } from "react";
import {
	useCreateNote,
	useDeleteNote,
	useNotes,
	useUpdateNote,
} from "@/hooks/notes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { X } from "@/lib/icons";

interface Note {
	id: string;
	value: string;
	is_checkbox: boolean;
	is_checked: boolean;
	display_order: number;
}

interface NoteEntityValue {
	state: EntityInputState;
	raw: string;
	parsed?: Note;
	id?: string;
}

interface NotesModalProps {
	isVisible: boolean;
	toggleIsVisible: () => void;
	date: string;
	mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
}

export const NotesModal = ({
	isVisible,
	toggleIsVisible,
	date,
	mealType,
}: NotesModalProps) => {
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
	const { notes = [] } = useNotes({
		noteType: "day_meal",
		date,
		mealType,
	});
	const createNote = useCreateNote();
	const updateNote = useUpdateNote();
	const deleteNote = useDeleteNote();

	const [noteEntities, setNoteEntities] = useState<NoteEntityValue[]>([]);

	// Sync notes from the API to local state
	useEffect(() => {
		const entities: NoteEntityValue[] = notes.map((note: Note) => ({
			state: EntityInputState.Parsed,
			raw: note.value,
			parsed: note,
			id: note.id,
		}));
		setNoteEntities(entities);
	}, [notes]);

	const handleAddNote = () => {
		const newNote: NoteEntityValue = {
			state: EntityInputState.New,
			raw: "",
			parsed: undefined,
			id: undefined,
		};
		setNoteEntities((prev) => [...prev, newNote]);
		setFocusedIndex(noteEntities.length);
	};

	const handleCheckboxToggle = (noteId: string, currentChecked: boolean) => {
		updateNote.mutate({
			noteId,
			isChecked: !currentChecked,
		});
	};

	const updateNoteEntity = (
		index: number,
		updates: Partial<NoteEntityValue>,
	) => {
		setNoteEntities((prev) => {
			const newEntities = [...prev];
			newEntities[index] = { ...newEntities[index], ...updates };
			return newEntities;
		});
	};

	const handleClose = () => {
		toggleIsVisible();
	};

	return (
		<Modal
			animationType="slide"
			visible={isVisible}
			onRequestClose={handleClose}
		>
			<View className="flex-1 bg-background">
				{/* Header */}
				<View className="flex-row items-center justify-between p-4 border-b border-border">
					<Text className="text-lg font-semibold">Notes - {mealType}</Text>
					<Button
						variant="ghost"
						size="icon"
						onPress={handleClose}
						className="h-8 w-8"
					>
						<X className="text-foreground" size={20} />
					</Button>
				</View>

				{/* Content */}
				<ScrollView className="flex-1 p-4">
					{noteEntities.map((noteEntity, index) => {
						const note = noteEntity.parsed;

						if (noteEntity.state === EntityInputState.Parsed && note) {
							return (
								<View key={note.id} className="flex-row items-start mb-3 gap-2">
									<Checkbox
										checked={note.is_checked}
										onCheckedChange={() =>
											handleCheckboxToggle(note.id, note.is_checked)
										}
										className="mt-1"
									/>
									<Button
										variant="ghost"
										onPress={() => {
											updateNoteEntity(index, {
												state: EntityInputState.Editing,
											});
											setFocusedIndex(index);
										}}
										className="flex-1 justify-start px-2 min-h-[40px]"
									>
										<Text
											className={
												note.is_checked
													? "text-muted-foreground line-through"
													: ""
											}
										>
											{note.value}
										</Text>
									</Button>
								</View>
							);
						}

						// Editing mode
						return (
							<View
								key={note?.id || index}
								className="flex-row items-start mb-3 gap-2"
							>
								<Checkbox
									checked={note?.is_checked || false}
									onCheckedChange={() => {}}
									disabled
									className="mt-1"
								/>
								<View className="flex-1">
									<EntityInput<Note>
										value={noteEntity}
										placeholder="Add a note..."
										onChange={(rawValue) => {
											updateNoteEntity(index, {
												raw: rawValue,
											});
										}}
										onSave={() => {
											const trimmedValue = noteEntity.raw.trim();

											if (!trimmedValue && note?.id) {
												// Delete if empty and exists in DB
												deleteNote.mutate(note.id);
												setNoteEntities((prev) =>
													prev.filter((_, i) => i !== index),
												);
											} else if (!trimmedValue && !note?.id) {
												// Remove in-memory note if empty and not saved
												setNoteEntities((prev) =>
													prev.filter((_, i) => i !== index),
												);
											} else if (trimmedValue && !note?.id) {
												// Create new note in DB
												createNote.mutate(
													{
														noteType: "day_meal",
														value: trimmedValue,
														isCheckbox: true,
														date,
														mealType,
													},
													{
														onSuccess: (data) => {
															// Note will be added via the notes query refetch
															// Remove the in-memory note
															setNoteEntities((prev) =>
																prev.filter((_, i) => i !== index),
															);
														},
													},
												);
											} else if (trimmedValue && note?.id) {
												// Update existing note
												updateNote.mutate(
													{
														noteId: note.id,
														value: trimmedValue,
													},
													{
														onSuccess: () => {
															updateNoteEntity(index, {
																state: EntityInputState.Parsed,
																raw: trimmedValue,
																parsed: { ...note, value: trimmedValue },
															});
														},
													},
												);
											}
										}}
										onEdit={() => {
											updateNoteEntity(index, {
												state: EntityInputState.Editing,
											});
										}}
										onClear={() => {
											if (note?.id) {
												// Delete from DB if it exists
												deleteNote.mutate(note.id);
											}
											// Remove from local state
											setNoteEntities((prev) =>
												prev.filter((_, i) => i !== index),
											);
										}}
										shouldFocus={focusedIndex === index}
										onFocus={() => setFocusedIndex(null)}
									/>
								</View>
							</View>
						);
					})}

					{/* Add Note Button */}
					<Button variant="outline" onPress={handleAddNote} className="mt-2">
						<Text>Add Note</Text>
					</Button>
				</ScrollView>
			</View>
		</Modal>
	);
};
