import {
	InstructionInput,
	InstructionInputState,
	InstructionInputValue,
} from "./InstructionInput";
import React, { useEffect } from "react";

import { Text } from "@/components/ui/text";

interface InstructionInputsProps {
	onInstructionsChange: (instructions: string[]) => void;
	initialValues?: string[];
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
					{ state: InstructionInputState.New, raw: "" },
				]
			: [{ state: InstructionInputState.New, raw: "" }],
	);
	const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

	useEffect(() => {
		const parsedInstructions = instructions
			.filter(
				(ins) =>
					(ins.state === InstructionInputState.Parsed ||
						ins.state === InstructionInputState.Editing) &&
					ins.parsed &&
					ins.raw.trim() !== "",
			)
			.map((ins) => ins.parsed!);
		onInstructionsChange(parsedInstructions);
	}, [instructions, onInstructionsChange]);

	return (
		<>
			{instructions.map((instruction, index) => (
				<InstructionInput
					key={index}
					placeholder="do something awesome"
					value={instruction}
					onMultipleInstructionsPaste={(instructionLines: string[]) => {
						// Handle pasting multiple instructions
						setInstructions((prevInstructions) => {
							const newInstructions = [...prevInstructions];

							// Replace the current instruction with the first pasted instruction
							const firstInstruction = instructionLines[0];
							const currentInstruction = newInstructions[index];
							currentInstruction.state = InstructionInputState.Parsed;
							currentInstruction.parsed = firstInstruction;
							currentInstruction.raw = firstInstruction;

							// Add the remaining instructions after the current one
							const additionalInstructions = instructionLines
								.slice(1)
								.map((parsed: string) => ({
									state: InstructionInputState.Parsed,
									raw: parsed,
									parsed,
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
									raw: "",
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
						currentInstruction.raw = rawValue;
						if (currentInstruction.state === InstructionInputState.New) {
							currentInstruction.state = InstructionInputState.Dirty;
							newInstructions.push({
								state: InstructionInputState.New,
								raw: "",
							});
						}
						setInstructions(newInstructions);
					}}
					onSave={() => {
						// Focus on the next NEW instruction immediately (before setting state)
						const nextNewIndex = instructions.findIndex(
							(ins, idx) =>
								idx > index && ins.state === InstructionInputState.New,
						);
						if (nextNewIndex !== -1) {
							setFocusedIndex(nextNewIndex);
						}

						setInstructions((prevInstructions) => {
							const newInstructions = [...prevInstructions];
							const currentInstruction = newInstructions[index];
							if (
								currentInstruction.parsed === currentInstruction.raw &&
								currentInstruction.state === InstructionInputState.Parsed
							) {
								return newInstructions;
							}
							currentInstruction.state = InstructionInputState.Parsed;
							currentInstruction.parsed = currentInstruction.raw;
							return newInstructions;
						});
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
					renderParsed={(parsed) => <Text className="text-base">{parsed}</Text>}
					shouldFocus={focusedIndex === index}
					onFocus={() => setFocusedIndex(null)}
				/>
			))}
		</>
	);
}
