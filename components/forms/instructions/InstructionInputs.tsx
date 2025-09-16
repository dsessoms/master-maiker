import {
	InstructionInput,
	InstructionInputState,
	InstructionInputValue,
	InstructionOrHeader,
} from "./InstructionInput";
import React, { useEffect } from "react";

import { Button } from "@/components/ui/button";
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
						state: InstructionInputState.Parsed,
						raw: parsed,
						parsed,
					})),
					{
						state: InstructionInputState.New,
						parsed: { type: "instruction", value: "" },
					},
				]
			: [
					{
						state: InstructionInputState.New,
						parsed: { type: "instruction", value: "" },
					},
				],
	);
	const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

	useEffect(() => {
		const parsedInstructions = instructions
			.filter(
				(ins) =>
					(ins.state === InstructionInputState.Parsed ||
						ins.state === InstructionInputState.Editing) &&
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
		setInstructions((prev) => {
			// Find the first ingredient with New state
			const firstNewIndex = prev.findIndex(
				(item) => item.state === InstructionInputState.New,
			);

			const newInstructions = [...prev];
			const headerItem = {
				state: InstructionInputState.New,
				parsed: { type: "header" as const, name: "" },
			};

			if (firstNewIndex !== -1) {
				// Insert header before the first New instruction
				newInstructions.splice(firstNewIndex, 0, headerItem);
				setFocusedIndex(firstNewIndex);
			} else {
				// If no New instruction found, add at the end
				newInstructions.push(headerItem);
				setFocusedIndex(newInstructions.length - 1);
			}

			return newInstructions;
		});
	}, []);

	return (
		<>
			{instructions.map((instruction, index) => (
				<InstructionInput
					key={index}
					placeholder={
						instruction.parsed.type === "header"
							? "Header name"
							: "Add instruction"
					}
					value={instruction}
					onMultipleInstructionsPaste={(instructionLines: string[]) => {
						// Handle pasting multiple instructions
						setInstructions((prevInstructions) => {
							const newInstructions = [...prevInstructions];

							// Replace the current instruction with the first pasted instruction
							const firstInstruction = instructionLines[0];
							const currentInstruction = newInstructions[index];
							currentInstruction.state = InstructionInputState.Parsed;
							currentInstruction.parsed = {
								type: "instruction",
								value: firstInstruction,
							};

							// Add the remaining instructions after the current one
							const additionalInstructions = instructionLines
								.slice(1)
								.map((parsed: string) => ({
									state: InstructionInputState.Parsed,
									parsed: { type: "instruction" as const, value: parsed },
								}));

							// Insert additional instructions after current index
							newInstructions.splice(index + 1, 0, ...additionalInstructions);

							// Add a new empty instruction at the end if there isn't one already
							const hasNewInstruction = newInstructions.some(
								(ins) => ins.state === InstructionInputState.New,
							);
							if (!hasNewInstruction) {
								newInstructions.push({
									state: InstructionInputState.New,
									parsed: { type: "instruction", value: "" },
								});
							}

							return newInstructions;
						});

						// Focus on the next new instruction after a short delay
						setTimeout(() => {
							const nextNewIndex = index + instructionLines.length;
							setFocusedIndex(nextNewIndex);
						}, 100);
					}}
					onChange={(rawValue: string) => {
						const newInstructions = [...instructions];
						const currentInstruction = newInstructions[index];
						if (currentInstruction.parsed.type === "header") {
							currentInstruction.parsed.name = rawValue;
						} else {
							currentInstruction.parsed.value = rawValue;
						}

						if (currentInstruction.state === InstructionInputState.New) {
							currentInstruction.state = InstructionInputState.Dirty;
							// Only add new input if the current input is not of type header
							if (currentInstruction.parsed.type !== "header") {
								newInstructions.push({
									state: InstructionInputState.New,
									parsed: { type: "instruction", value: "" },
								});
							}
						}
						setInstructions(newInstructions);
					}}
					onSave={() => {
						setInstructions((prevInstructions) => {
							const newInstructions = [...prevInstructions];
							const currentInstruction = newInstructions[index];

							// Check if the field is empty and not of state NEW
							const isEmpty =
								currentInstruction.parsed.type === "header"
									? !currentInstruction.parsed.name.trim()
									: !currentInstruction.parsed.value.trim();

							if (
								isEmpty &&
								currentInstruction.state === InstructionInputState.New &&
								currentInstruction.parsed.type !== "header"
							) {
								return newInstructions;
							}

							if (isEmpty) {
								// Delete empty input field
								newInstructions.splice(index, 1);
								return newInstructions;
							}

							currentInstruction.state = InstructionInputState.Parsed;
							return newInstructions;
						});

						// Focus on the next NEW instruction immediately (after setting state)
						setTimeout(() => {
							const nextNewIndex = instructions.findIndex(
								(ins, idx) =>
									idx > index && ins.state === InstructionInputState.New,
							);
							if (nextNewIndex !== -1) {
								setFocusedIndex(nextNewIndex);
							}
						}, 0);
					}}
					onEdit={() => {
						const newInstructions = [...instructions];
						const currentInstruction = newInstructions[index];
						currentInstruction.state = InstructionInputState.Editing;
						setInstructions(newInstructions);
					}}
					onClear={() => {
						const newInstructions = [...instructions];
						newInstructions.splice(index, 1);
						setInstructions(newInstructions);
					}}
					renderParsed={(parsed) => (
						<Text
							className={cn({
								"text-foreground": true,
								"font-semibold": parsed.type === "header",
							})}
						>
							{parsed.type === "header" ? parsed.name : parsed.value}
						</Text>
					)}
					shouldFocus={focusedIndex === index}
					onFocus={() => setFocusedIndex(null)}
				/>
			))}

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
