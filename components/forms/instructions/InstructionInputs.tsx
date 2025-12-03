import {
	InstructionInput,
	InstructionInputValue,
	InstructionOrHeader,
} from "./InstructionInput";
import React, { useEffect, useReducer } from "react";

import { Button } from "@/components/ui/button";
import { Plus } from "@/lib/icons";
import { StatefulInputState } from "../stateful-input/stateful-input";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { cn } from "@/lib/utils";

interface InstructionInputsProps {
	onInstructionsChange: (instructions: InstructionOrHeader[]) => void;
	initialValues?: InstructionOrHeader[];
}

function getRawValue(instruction: InstructionOrHeader) {
	return instruction.type === "header" ? instruction.name : instruction.value;
}

type InstructionAction =
	| {
			type: "UPDATE";
			index: number;
			updates: Partial<InstructionInputValue>;
	  }
	| {
			type: "DELETE";
			index: number;
	  }
	| {
			type: "INSERT";
			index: number;
			instruction: InstructionInputValue;
			setFocus?: boolean;
	  }
	| {
			type: "MULTIPLE_PASTE";
			index: number;
			instructionLines: string[];
	  }
	| {
			type: "CLEAR_FOCUS";
	  };

interface InstructionState {
	instructions: InstructionInputValue[];
	focusedIndex: number | null;
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
				});
			}

			// Auto-focus when entering edit state
			const shouldFocus = action.updates.state === StatefulInputState.Edit;

			// After saving (View state), focus next new instruction
			let focusedIndex = state.focusedIndex;
			if (action.updates.state === StatefulInputState.View) {
				const nextNewIndex = newInstructions.findIndex(
					(ins, idx) =>
						idx > action.index && ins.state === StatefulInputState.New,
				);
				focusedIndex = nextNewIndex !== -1 ? nextNewIndex : null;
			} else if (shouldFocus) {
				focusedIndex = action.index;
			}

			return {
				instructions: newInstructions,
				focusedIndex,
			};
		}

		case "DELETE": {
			const newInstructions = [...state.instructions];
			newInstructions.splice(action.index, 1);
			return {
				instructions: newInstructions,
				focusedIndex: state.focusedIndex,
			};
		}

		case "INSERT": {
			const newInstructions = [...state.instructions];
			newInstructions.splice(action.index, 0, action.instruction);
			return {
				instructions: newInstructions,
				focusedIndex: action.setFocus ? action.index : state.focusedIndex,
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
					});
				}
			});

			// Add new instruction at end
			newInstructions.push({
				state: StatefulInputState.New,
				raw: "",
				parsed: undefined,
			});

			// Focus the new instruction at the end
			const focusedIndex = action.index + action.instructionLines.length;

			return {
				instructions: newInstructions,
				focusedIndex,
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

function getInitialState(
	initialValues?: InstructionOrHeader[],
): InstructionState {
	const instructions: InstructionInputValue[] =
		initialValues && initialValues.length > 0
			? initialValues.map((instruction) => ({
					state: StatefulInputState.View,
					raw: getRawValue(instruction),
					parsed: instruction,
				}))
			: [];

	// Always add a new empty instruction at the end
	instructions.push({
		state: StatefulInputState.New,
		raw: "",
		parsed: undefined,
	});

	return {
		instructions,
		focusedIndex: null,
	};
}

export function InstructionInputs({
	onInstructionsChange,
	initialValues,
}: InstructionInputsProps) {
	const [{ instructions, focusedIndex }, dispatch] = useReducer(
		instructionsReducer,
		initialValues,
		getInitialState,
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
			state: StatefulInputState.New,
			raw: "",
			parsed: { type: "header" as const, name: "" },
		};

		const insertIndex =
			firstNewIndex !== -1 ? firstNewIndex : instructions.length;

		dispatch({
			type: "INSERT",
			index: insertIndex,
			instruction: headerItem,
			setFocus: true,
		});
	}, [instructions]);

	return (
		<>
			{instructions.map((instruction, index) => {
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
						key={index}
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
						renderParsed={(parsed) => {
							if (parsed.type === "header") {
								return (
									<Text
										className={cn({
											"text-foreground": true,
											"font-semibold": true,
										})}
									>
										{parsed.name}
									</Text>
								);
							}

							// For instructions, match the recipe details page format
							return (
								<View className="flex-row w-full">
									<Text className="font-semibold text-base mr-3 text-primary">
										{instructionStepNumber}.
									</Text>
									<Text
										className="flex-1 text-base leading-6"
										style={{ flexShrink: 1 }}
									>
										{parsed.value}
									</Text>
								</View>
							);
						}}
						shouldFocus={focusedIndex === index}
						onFocus={() => dispatch({ type: "CLEAR_FOCUS" })}
					/>
				);
			})}

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
