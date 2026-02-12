import {
	InstructionInput,
	InstructionInputValue,
	InstructionOrHeader,
} from "./InstructionInput";
import React, { useEffect, useReducer } from "react";
import { AnimatedRef } from "react-native-reanimated";
import Sortable, { SortableGridRenderItem } from "react-native-sortables";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { GripVertical, Plus } from "@/lib/icons";
import { StatefulInputState } from "../stateful-input/stateful-input";
import { Text } from "@/components/ui/text";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";

interface InstructionInputsProps {
	onInstructionsChange: (instructions: InstructionOrHeader[]) => void;
	initialValues?: InstructionOrHeader[];
	scrollableRef?: AnimatedRef<any>;
}

type ExtendedInstructionInputValue = InstructionInputValue & {
	id: string;
};

function getRawValue(instruction: InstructionOrHeader) {
	return instruction.type === "header" ? instruction.name : instruction.value;
}

type InstructionAction =
	| {
			type: "UPDATE";
			index: number;
			updates: Partial<ExtendedInstructionInputValue>;
	  }
	| {
			type: "DELETE";
			index: number;
	  }
	| {
			type: "INSERT";
			index: number;
			instruction: ExtendedInstructionInputValue;
	  }
	| {
			type: "MULTIPLE_PASTE";
			index: number;
			instructionLines: string[];
	  }
	| {
			type: "REORDER";
			from: number;
			to: number;
	  };

interface InstructionState {
	instructions: ExtendedInstructionInputValue[];
}

function instructionsReducer(
	state: InstructionState,
	action: InstructionAction,
): InstructionState {
	switch (action.type) {
		case "UPDATE": {
			const newInstructions = [...state.instructions];
			const wasNew =
				state.instructions[action.index].state === StatefulInputState.New;
			const isHeader = action.updates.parsed?.type === "header";

			Object.assign(newInstructions[action.index], action.updates);

			// Auto-add new instruction at end if this was a New instruction becoming Edit/View (but not for headers)
			if (
				wasNew &&
				!isHeader &&
				action.updates.state !== StatefulInputState.New
			) {
				newInstructions.push({
					state: StatefulInputState.New,
					raw: "",
					parsed: undefined,
					id: uuidv4(),
				});
			}

			return {
				instructions: newInstructions,
			};
		}

		case "DELETE": {
			const newInstructions = [...state.instructions];
			newInstructions.splice(action.index, 1);
			return {
				instructions: newInstructions,
			};
		}

		case "INSERT": {
			const newInstructions = [...state.instructions];
			newInstructions.splice(action.index, 0, action.instruction);
			return {
				instructions: newInstructions,
			};
		}

		case "MULTIPLE_PASTE": {
			const newInstructions = [...state.instructions];

			// Update all pasted instructions
			action.instructionLines.forEach((line, i) => {
				const targetIndex = action.index + i;
				if (targetIndex < newInstructions.length) {
					// Update existing instruction
					Object.assign(newInstructions[targetIndex], {
						state: StatefulInputState.View,
						raw: line,
						parsed: { type: "instruction" as const, value: line },
					});
				} else {
					// Insert new instruction
					newInstructions.push({
						state: StatefulInputState.View,
						raw: line,
						parsed: { type: "instruction" as const, value: line },
						id: uuidv4(),
					});
				}
			});

			// Add new instruction at end
			newInstructions.push({
				state: StatefulInputState.New,
				raw: "",
				parsed: undefined,
				id: uuidv4(),
			});

			// Focus the new instruction at the end
			const focusedIndex = action.index + action.instructionLines.length;

			return {
				instructions: newInstructions,
			};
		}

		case "REORDER": {
			const { from, to } = action;

			if (from < 0 || to < 0 || from >= state.instructions.length) {
				return state; // Invalid index, do nothing
			}

			const newInstructions = [...state.instructions];
			const [movedItem] = newInstructions.splice(from, 1);
			newInstructions.splice(to, 0, movedItem);

			return {
				...state,
				instructions: newInstructions,
			};
		}

		default:
			return state;
	}
}

function getInitialState(
	initialValues?: InstructionOrHeader[],
): InstructionState {
	const instructions: ExtendedInstructionInputValue[] =
		initialValues && initialValues.length > 0
			? initialValues.map((instruction) => ({
					state: StatefulInputState.View,
					raw: getRawValue(instruction),
					parsed: instruction,
					id: uuidv4(),
				}))
			: [];

	// Always add a new empty instruction at the end
	instructions.push({
		state: StatefulInputState.New,
		raw: "",
		parsed: undefined,
		id: uuidv4(),
	});

	return {
		instructions,
	};
}

export function InstructionInputs({
	onInstructionsChange,
	initialValues,
	scrollableRef,
}: InstructionInputsProps) {
	const [{ instructions }, dispatch] = useReducer(
		instructionsReducer,
		initialValues,
		getInitialState,
	);

	const sortEnabled = instructions.every(
		(instruction) => instruction.state !== StatefulInputState.Edit,
	);

	useEffect(() => {
		const parsedInstructions = instructions
			.filter(
				(ins) =>
					(ins.state === StatefulInputState.View ||
						ins.state === StatefulInputState.Edit) &&
					ins.parsed &&
					(ins.parsed.type === "header"
						? ins.parsed.name.trim()
						: ins.parsed.value.trim()) !== "",
			)
			.map((ins) => ins.parsed!);
		onInstructionsChange(parsedInstructions);
	}, [instructions, onInstructionsChange]);

	// Function to add a header above the first New Instruction input
	const addHeader = React.useCallback(() => {
		// Find the first instruction with New state
		const firstNewIndex = instructions.findIndex(
			(item) => item.state === StatefulInputState.New,
		);

		const headerItem = {
			state: StatefulInputState.Edit,
			raw: "",
			parsed: { type: "header" as const, name: "" },
			id: uuidv4(),
		};

		const insertIndex =
			firstNewIndex !== -1 ? firstNewIndex : instructions.length;

		dispatch({
			type: "INSERT",
			index: insertIndex,
			instruction: headerItem,
		});
	}, [instructions]);

	const renderItem = React.useCallback<
		SortableGridRenderItem<ExtendedInstructionInputValue>
	>(
		({ item: instruction, index }) => {
			// Calculate step number for instructions (excluding headers)
			const instructionStepNumber =
				instructions
					.slice(0, index)
					.filter(
						(ins) =>
							ins.parsed?.type === "instruction" &&
							(ins.state === StatefulInputState.View ||
								ins.state === StatefulInputState.Edit),
					).length + 1;

			return (
				<InstructionInput
					key={instruction.id}
					placeholder={
						instruction.parsed?.type === "header"
							? "Header name"
							: `Step ${instructionStepNumber}`
					}
					value={instruction}
					onMultiplePaste={(instructionLines: string[]) => {
						dispatch({
							type: "MULTIPLE_PASTE",
							index,
							instructionLines,
						});
					}}
					onChange={(rawValue: string) => {
						const currentInstruction = instructions[index];

						// Create updated parsed value
						let updatedParsed: InstructionOrHeader;
						if (currentInstruction.parsed) {
							if (currentInstruction.parsed.type === "header") {
								updatedParsed = { type: "header", name: rawValue };
							} else {
								updatedParsed = { type: "instruction", value: rawValue };
							}
						} else {
							updatedParsed = { type: "instruction", value: rawValue };
						}

						dispatch({
							type: "UPDATE",
							index,
							updates: {
								raw: rawValue,
								parsed: updatedParsed,
								state: StatefulInputState.Edit,
							},
						});
					}}
					onSave={() => {
						const currentInstruction = instructions[index];
						const isEmpty = !currentInstruction.raw.trim();

						// Handle empty instructions
						if (
							isEmpty &&
							currentInstruction.state === StatefulInputState.New &&
							currentInstruction.parsed?.type !== "header"
						) {
							return;
						}

						if (isEmpty) {
							// Delete empty instruction
							dispatch({ type: "DELETE", index });
							return;
						}

						// Mark as parsed and focus next NEW instruction
						dispatch({
							type: "UPDATE",
							index,
							updates: { state: StatefulInputState.View },
						});
					}}
					onEdit={() => {
						dispatch({
							type: "UPDATE",
							index,
							updates: { state: StatefulInputState.Edit },
						});
					}}
					onClear={() => {
						dispatch({ type: "DELETE", index });
					}}
					renderParsed={(parsed, onEdit) => {
						if (parsed.type === "header") {
							return (
								<View className="flex-row justify-between w-full bg-background rounded-md">
									<Pressable onPress={onEdit} className="flex-1">
										<Text className="text-foreground font-semibold select-none">
											{parsed.name}
										</Text>
									</Pressable>
									<Sortable.Handle>
										<GripVertical size={20} color="#666" />
									</Sortable.Handle>
								</View>
							);
						}

						return (
							<View className="flex-row w-full bg-background rounded-md">
								<Pressable onPress={onEdit} className="flex-1">
									<View className="flex-1 flex-row">
										<Text className="font-semibold text-base mr-3 select-none">
											{instructionStepNumber}.
										</Text>
										<Text
											className="flex-1 text-base leading-6 select-none"
											style={{ flexShrink: 1 }}
										>
											{parsed.value}
										</Text>
									</View>
								</Pressable>

								<Sortable.Handle>
									<GripVertical size={20} color="#666" />
								</Sortable.Handle>
							</View>
						);
					}}
				/>
			);
		},
		[instructions],
	);

	return (
		<>
			<Sortable.Grid
				data={instructions}
				renderItem={renderItem}
				onDragEnd={({ fromIndex, toIndex }) =>
					dispatch({ type: "REORDER", from: fromIndex, to: toIndex })
				}
				keyExtractor={(item) => item.id}
				columns={1}
				rowGap={8}
				scrollableRef={scrollableRef}
				sortEnabled={sortEnabled}
				enableActiveItemSnap={false}
				activeItemShadowOpacity={0}
				customHandle
			/>

			<Button
				variant="outline"
				onPress={addHeader}
				className="mt-2 flex-row self-start"
			>
				<Plus className="text-primary" size={15} />
				<Text>Header</Text>
			</Button>
		</>
	);
}
