import { Modal, ScrollView, View } from "react-native";
import React, { useContext, useEffect, useReducer } from "react";
import {
	StatefulInput,
	StatefulInputState,
} from "@/components/forms/stateful-input/stateful-input";
import { useCreateNote, useDeleteNote, useUpdateNote } from "@/hooks/notes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MealPlanContext } from "@/context/meal-plan-context";
import { Text } from "@/components/ui/text";
import { X } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Pressable } from "react-native-gesture-handler";

interface Note {
	id: string;
	value: string;
	is_checkbox: boolean;
	is_checked: boolean;
	display_order: number;
}

interface NoteStatefulValue {
	state: StatefulInputState;
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

type NoteAction =
	| {
			type: "UPDATE";
			index: number;
			updates: Partial<NoteStatefulValue>;
	  }
	| {
			type: "DELETE";
			index: number;
	  }
	| {
			type: "INITIALIZE";
			notes: Note[];
	  }
	| {
			type: "CLEAR_FOCUS";
	  };

interface NoteState {
	notes: NoteStatefulValue[];
	focusedIndex: number | null;
}

function notesReducer(state: NoteState, action: NoteAction): NoteState {
	switch (action.type) {
		case "UPDATE": {
			const newNotes = [...state.notes];
			const wasNew = state.notes[action.index].state === StatefulInputState.New;

			Object.assign(newNotes[action.index], action.updates);

			// Auto-add new note at end if this was a New note becoming Edit/View
			if (wasNew && action.updates.state !== StatefulInputState.New) {
				newNotes.push({
					state: StatefulInputState.New,
					raw: "",
					parsed: undefined,
					id: undefined,
				});
			}

			// Auto-focus when entering edit state
			const shouldFocus = action.updates.state === StatefulInputState.Edit;

			// After saving (View state), focus next new note
			let focusedIndex = state.focusedIndex;
			if (action.updates.state === StatefulInputState.View) {
				const nextNewIndex = newNotes.findIndex(
					(note, idx) =>
						idx > action.index && note.state === StatefulInputState.New,
				);
				focusedIndex = nextNewIndex !== -1 ? nextNewIndex : null;
			} else if (shouldFocus) {
				focusedIndex = action.index;
			}

			return {
				notes: newNotes,
				focusedIndex,
			};
		}

		case "DELETE": {
			const newNotes = [...state.notes];
			newNotes.splice(action.index, 1);
			return {
				notes: newNotes,
				focusedIndex: state.focusedIndex,
			};
		}

		case "INITIALIZE": {
			const notes: NoteStatefulValue[] = action.notes.map((note) => ({
				state: StatefulInputState.View,
				raw: note.value,
				parsed: note,
				id: note.id,
			}));

			// Always add a new empty note at the end
			notes.push({
				state: StatefulInputState.New,
				raw: "",
				parsed: undefined,
				id: undefined,
			});

			return {
				notes,
				focusedIndex: null,
			};
		}

		case "CLEAR_FOCUS": {
			return {
				...state,
				focusedIndex: null,
			};
		}

		default:
			return state;
	}
}

function getInitialState(): NoteState {
	return {
		notes: [
			{
				state: StatefulInputState.New,
				raw: "",
				parsed: undefined,
				id: undefined,
			},
		],
		focusedIndex: null,
	};
}

export const NotesModal = ({
	isVisible,
	toggleIsVisible,
	date,
	mealType,
}: NotesModalProps) => {
	const [{ notes: noteEntities, focusedIndex }, dispatch] = useReducer(
		notesReducer,
		undefined,
		getInitialState,
	);
	const { notesByDayAndMeal } = useContext(MealPlanContext);
	const notesKey = `${date}-${mealType}`;
	const notes = notesByDayAndMeal[notesKey] || [];
	const createNote = useCreateNote();
	const updateNote = useUpdateNote();
	const deleteNote = useDeleteNote();

	// Sync notes from the API to local state
	// Use a stable key based on note IDs and checked states to prevent infinite loops
	// but still update when checkboxes are toggled
	const notesKey2 = notes.map((n) => `${n.id}-${n.is_checked}`).join(",");
	useEffect(() => {
		dispatch({ type: "INITIALIZE", notes });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [notesKey2, date, mealType]);

	const handleCheckboxToggle = (noteId: string, currentChecked: boolean) => {
		updateNote.mutate({
			id: noteId,
			isChecked: !currentChecked,
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
					{noteEntities.map((noteStateful, index) => {
						const note = noteStateful.parsed;

						return (
							<View
								key={note?.id || index}
								className="flex-row items-start mb-3 gap-2"
							>
								<Checkbox
									checked={note?.is_checked || false}
									onCheckedChange={() => {
										note?.id &&
											handleCheckboxToggle(note?.id, note?.is_checked);
									}}
									disabled={!note?.id}
									className="mt-1"
								/>
								<View className="flex-1">
									<StatefulInput<Note>
										value={noteStateful}
										placeholder="Add a note..."
										renderParsed={(parsed, onEdit) => {
											return (
												<Pressable onPress={onEdit}>
													<Text
														className={cn({
															"text-muted-foreground line-through":
																note?.is_checked,
														})}
													>
														{parsed.value}
													</Text>
												</Pressable>
											);
										}}
										onChange={(rawValue) => {
											dispatch({
												type: "UPDATE",
												index,
												updates: {
													raw: rawValue,
													state: StatefulInputState.Edit,
												},
											});
										}}
										onSave={() => {
											const trimmedValue = noteStateful.raw.trim();

											// Handle empty notes
											if (
												!trimmedValue &&
												noteStateful.state === StatefulInputState.New
											) {
												return;
											}

											if (!trimmedValue) {
												// Delete empty note
												if (note?.id) {
													deleteNote.mutate(note.id);
												}
												dispatch({ type: "DELETE", index });
												return;
											}

											if (!note?.id) {
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
														onSuccess: () => {
															// Note will be added via the notes query refetch
															// The INITIALIZE action will handle updating the state
														},
													},
												);
											} else {
												// Update existing note
												updateNote.mutate(
													{
														id: note.id,
														value: trimmedValue,
													},
													{
														onSuccess: () => {
															dispatch({
																type: "UPDATE",
																index,
																updates: {
																	state: StatefulInputState.View,
																	raw: trimmedValue,
																	parsed: { ...note, value: trimmedValue },
																},
															});
														},
													},
												);
											}
										}}
										onEdit={() => {
											dispatch({
												type: "UPDATE",
												index,
												updates: {
													state: StatefulInputState.Edit,
												},
											});
										}}
										onClear={() => {
											if (note?.id) {
												// Delete from DB if it exists
												deleteNote.mutate(note.id);
											}
											// Remove from local state
											dispatch({ type: "DELETE", index });
										}}
									/>
								</View>
							</View>
						);
					})}
				</ScrollView>
			</View>
		</Modal>
	);
};
