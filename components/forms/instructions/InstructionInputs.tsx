import {
	InstructionInput,
	InstructionInputValue,
	InstructionOrHeader,
} from "./InstructionInput";
import React, { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { EntityInputState } from "../entity-input";
import { Plus } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface InstructionInputsProps {
	onInstructionsChange: (instructions: InstructionOrHeader[]) => void;
	initialValues?: InstructionOrHeader[];
}

export function InstructionInputs({
	onInstructionsChange,
	initialValues,
}: InstructionInputsProps) {
	const [instructions, setInstructions] = React.useState<
		InstructionInputValue[]
	>(
		initialValues && initialValues.length > 0
			? [
					...initialValues.map((parsed) => ({
						state: EntityInputState.Parsed,
						raw: parsed.type === "header" ? parsed.name : parsed.value,
						parsed,
					})),
					{
						state: EntityInputState.New,
						raw: "",
						parsed: undefined,
					},
				]
			: [
					{
						state: EntityInputState.New,
						raw: "",
						parsed: undefined,
					},
				],
	);
	const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

	// Centralized instruction update function
	const updateInstructions = React.useCallback(
		(options: {
			startIndex?: number;
			updates?: Partial<InstructionInputValue>;
			additionalInstructions?: Array<InstructionInputValue>;
			addNewAtEnd?: boolean;
			focusNextNew?: boolean;
			deleteAtIndex?: boolean;
			insertAtIndex?: { index: number; instruction: InstructionInputValue };
			appendInstruction?: InstructionInputValue;
		}) => {
			const {
				startIndex,
				updates = {},
				additionalInstructions,
				addNewAtEnd,
				focusNextNew,
				deleteAtIndex,
				insertAtIndex,
				appendInstruction,
			} = options;

			setInstructions((prev) => {
				const newInstructions = [...prev];

				if (deleteAtIndex && startIndex !== undefined) {
					// Delete the instruction at startIndex
					newInstructions.splice(startIndex, 1);
				} else if (insertAtIndex) {
					// Insert instruction at specific index
					newInstructions.splice(
						insertAtIndex.index,
						0,
						insertAtIndex.instruction,
					);
				} else if (appendInstruction) {
					// Append instruction at the end
					newInstructions.push(appendInstruction);
				} else if (startIndex !== undefined) {
					// Update the instruction at startIndex
					Object.assign(newInstructions[startIndex], updates);

					// Insert additional instructions after startIndex if provided
					if (additionalInstructions && additionalInstructions.length > 0) {
						newInstructions.splice(
							startIndex + 1,
							0,
							...additionalInstructions,
						);
					}
				}

				// Add new instruction at end if requested
				if (addNewAtEnd) {
					newInstructions.push({
						state: EntityInputState.New,
						raw: "",
						parsed: undefined,
					});
				}

				if (startIndex != null && updates.state === EntityInputState.Editing) {
					setFocusedIndex(startIndex);
				} else if (
					focusNextNew &&
					!newInstructions.some(
						(ins) => ins.state === EntityInputState.Editing,
					) &&
					startIndex != null
				) {
					const nextNewIndex = instructions.findIndex(
						(ins, idx) =>
							idx > startIndex && ins.state === EntityInputState.New,
					);
					if (nextNewIndex !== -1) {
						setFocusedIndex(nextNewIndex);
					}
				}

				return newInstructions;
			});
		},
		[instructions],
	);

	useEffect(() => {
		const parsedInstructions = instructions
			.filter(
				(ins) =>
					(ins.state === EntityInputState.Parsed ||
						ins.state === EntityInputState.Editing) &&
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
			(item) => item.state === EntityInputState.New,
		);

		const headerItem = {
			state: EntityInputState.New,
			raw: "",
			parsed: { type: "header" as const, name: "" },
		};

		if (firstNewIndex !== -1) {
			// Insert header before the first New instruction
			updateInstructions({
				insertAtIndex: { index: firstNewIndex, instruction: headerItem },
			});
			setFocusedIndex(firstNewIndex);
		} else {
			// If no New instruction found, add at the end
			updateInstructions({
				appendInstruction: headerItem,
			});
			setFocusedIndex(instructions.length);
		}
	}, [instructions, updateInstructions]);

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
								(ins.state === EntityInputState.Parsed ||
									ins.state === EntityInputState.Editing ||
									ins.state === EntityInputState.Dirty),
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
							// Handle pasting multiple instructions using centralized update
							const additionalInstructions = instructionLines
								.slice(1)
								.map((parsed: string) => ({
									state: EntityInputState.Parsed,
									raw: parsed,
									parsed: { type: "instruction" as const, value: parsed },
								}));

							updateInstructions({
								startIndex: index,
								updates: {
									state: EntityInputState.Parsed,
									raw: instructionLines[0],
									parsed: {
										type: "instruction",
										value: instructionLines[0],
									},
								},
								additionalInstructions,
								addNewAtEnd: true,
							});

							// Focus on the next new instruction after a short delay
							setTimeout(() => {
								const nextNewIndex = index + instructionLines.length;
								setFocusedIndex(nextNewIndex);
							}, 100);
						}}
						onChange={(rawValue: string) => {
							const currentInstruction = instructions[index];
							const wasNew = currentInstruction.state === EntityInputState.New;

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

							updateInstructions({
								startIndex: index,
								updates: {
									raw: rawValue,
									parsed: updatedParsed,
									state: wasNew
										? EntityInputState.Dirty
										: currentInstruction.state,
								},
								addNewAtEnd: wasNew && updatedParsed.type !== "header",
							});
						}}
						onSave={() => {
							const currentInstruction = instructions[index];
							const isEmpty = !currentInstruction.raw.trim();

							// Handle empty instructions
							if (
								isEmpty &&
								currentInstruction.state === EntityInputState.New &&
								currentInstruction.parsed?.type !== "header"
							) {
								return;
							}

							if (isEmpty) {
								// Delete empty instruction
								updateInstructions({
									startIndex: index,
									deleteAtIndex: true,
								});
								return;
							}

							// Mark as parsed and focus next NEW instruction
							updateInstructions({
								startIndex: index,
								updates: { state: EntityInputState.Parsed },
								focusNextNew: true,
							});
						}}
						onEdit={() => {
							updateInstructions({
								startIndex: index,
								updates: { state: EntityInputState.Editing },
							});
						}}
						onClear={() => {
							updateInstructions({
								startIndex: index,
								deleteAtIndex: true,
							});
						}}
						renderParsed={(parsed) => (
							<Text
								className={cn({
									"text-foreground": true,
									"font-semibold": parsed.type === "header",
								})}
							>
								{parsed.type === "header"
									? parsed.name
									: `${instructionStepNumber}. ${parsed.value}`}
							</Text>
						)}
						shouldFocus={focusedIndex === index}
						onFocus={() => setFocusedIndex(null)}
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
