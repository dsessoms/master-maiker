import {
	EntityInput,
	EntityInputState,
	EntityInputValue,
} from "./IngredientInput";
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
		EntityInputValue<string>[]
	>(
		initialValues && initialValues.length > 0
			? [
					...initialValues.map((parsed) => ({
						state: EntityInputState.Parsed,
						raw: parsed,
						parsed,
					})),
					{ state: EntityInputState.New, raw: "" },
				]
			: [{ state: EntityInputState.New, raw: "" }],
	);
	const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

	useEffect(() => {
		const parsedInstructions = instructions
			.filter(
				(ins) =>
					(ins.state === EntityInputState.Parsed ||
						ins.state === EntityInputState.Editing) &&
					ins.parsed &&
					ins.raw.trim() !== "",
			)
			.map((ins) => ins.parsed!);
		onInstructionsChange(parsedInstructions);
	}, [instructions, onInstructionsChange]);

	return (
		<>
			{instructions.map((instruction, index) => (
				<EntityInput<string>
					key={index}
					placeholder="do something awesome"
					value={instruction}
					onMultipleIngredientsPaste={(instructionLines) => {
						// Handle pasting multiple instructions
						setInstructions((prevInstructions) => {
							const newInstructions = [...prevInstructions];

							// Replace the current instruction with the first pasted instruction
							const firstInstruction = instructionLines[0];
							const currentInstruction = newInstructions[index];
							currentInstruction.state = EntityInputState.Parsed;
							currentInstruction.parsed = firstInstruction;
							currentInstruction.raw = firstInstruction;

							// Add the remaining instructions after the current one
							const additionalInstructions = instructionLines
								.slice(1)
								.map((parsed) => ({
									state: EntityInputState.Parsed as const,
									raw: parsed,
									parsed,
								}));

							// Insert additional instructions after current index
							newInstructions.splice(index + 1, 0, ...additionalInstructions);

							// Add a new empty instruction at the end if there isn't one already
							const hasNewInstruction = newInstructions.some(
								(ins) => ins.state === EntityInputState.New,
							);
							if (!hasNewInstruction) {
								newInstructions.push({
									state: EntityInputState.New,
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
					onChange={(rawValue) => {
						const newInstructions = [...instructions];
						const currentInstruction = newInstructions[index];
						currentInstruction.raw = rawValue;
						if (currentInstruction.state === EntityInputState.New) {
							currentInstruction.state = EntityInputState.Dirty;
							newInstructions.push({
								state: EntityInputState.New,
								raw: "",
							});
						}
						setInstructions(newInstructions);
					}}
					onSave={() => {
						// Focus on the next NEW instruction immediately (before setting state)
						const nextNewIndex = instructions.findIndex(
							(ins, idx) => idx > index && ins.state === EntityInputState.New,
						);
						if (nextNewIndex !== -1) {
							setFocusedIndex(nextNewIndex);
						}

						setInstructions((prevInstructions) => {
							const newInstructions = [...prevInstructions];
							const currentInstruction = newInstructions[index];
							if (
								currentInstruction.parsed === currentInstruction.raw &&
								currentInstruction.state === EntityInputState.Parsed
							) {
								return newInstructions;
							}
							currentInstruction.state = EntityInputState.Parsed;
							currentInstruction.parsed = currentInstruction.raw;
							return newInstructions;
						});
					}}
					onEdit={() => {
						const newInstructions = [...instructions];
						const currentInstruction = newInstructions[index];
						currentInstruction.state = EntityInputState.Editing;
						setInstructions(newInstructions);
					}}
					onClear={() => {
						const newInstructions = [...instructions];
						newInstructions.splice(index, 1);
						setInstructions(newInstructions);
					}}
					renderParsed={(parsed) => (
						<Text style={{ fontSize: 16 }}>{parsed}</Text>
					)}
					shouldFocus={focusedIndex === index}
					onFocus={() => setFocusedIndex(null)}
				/>
			))}
		</>
	);
}
