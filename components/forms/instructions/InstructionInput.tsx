import { Header, Instruction } from "@/lib/schemas";
import { Pressable, TextInput, View } from "react-native";
import React, { useEffect, useRef } from "react";

import { Input } from "../../ui/input";
import { X } from "@/lib/icons/x";

export enum InstructionInputState {
	New = "new",
	Dirty = "dirty",
	Parsed = "parsed",
	Editing = "editing",
}

export type InstructionOrHeader = Instruction | Header;

export type InstructionInputValue = {
	state: InstructionInputState;
	parsed: InstructionOrHeader;
};

export interface InstructionInputProps {
	value: InstructionInputValue;
	placeholder?: string;
	onChange: (rawValue: string) => void;
	onSave: () => void;
	onEdit: () => void;
	onClear?: () => void;
	onMultipleInstructionsPaste?: (instructions: string[]) => void;
	renderParsed?: (parsed: InstructionOrHeader) => React.ReactNode;
	shouldFocus?: boolean;
	onFocus?: () => void;
}

export function InstructionInput<T>({
	value,
	onChange,
	onSave,
	onEdit,
	onClear,
	onMultipleInstructionsPaste,
	renderParsed,
	placeholder,
	shouldFocus,
	onFocus,
}: InstructionInputProps) {
	const inputRef = useRef<TextInput>(null);
	const shouldSaveOnBlur = useRef(false);
	const isDeleting = useRef(false);

	const parsedValue =
		value.parsed.type === "header" ? value.parsed.name : value.parsed.value;

	// Helper function to handle blur logic with conditional saving
	const handleBlur = () => {
		shouldSaveOnBlur.current = true;

		setTimeout(() => {
			if (shouldSaveOnBlur.current && !isDeleting.current) {
				onSave();
			}
			shouldSaveOnBlur.current = false;
		}, 50);
	};

	useEffect(() => {
		if (inputRef.current && value.state === InstructionInputState.Editing) {
			inputRef.current.focus();
			// Small delay to ensure the input is properly focused before scrolling
			setTimeout(() => {
				inputRef.current?.measureInWindow((x, y, width, height) => {
					// This helps ensure the input is visible when focused
				});
			}, 100);
		}
	}, [value.state]);

	useEffect(() => {
		if (inputRef.current && shouldFocus) {
			inputRef.current.focus();
			// Small delay to ensure the input is properly focused before scrolling
			setTimeout(() => {
				inputRef.current?.measureInWindow((x, y, width, height) => {
					// This helps ensure the input is visible when focused
				});
			}, 100);
			onFocus?.();
		}
	}, [shouldFocus, onFocus]);

	if (value.state === InstructionInputState.Parsed && value.parsed) {
		if (renderParsed) {
			return (
				<Pressable
					onPress={onEdit}
					className="min-h-[40px] rounded mb-2 w-full flex-row items-center px-2"
				>
					{renderParsed(value.parsed)}
				</Pressable>
			);
		}
		return null;
	}

	return (
		<View className="relative w-full">
			<Input
				ref={inputRef}
				placeholder={placeholder}
				value={parsedValue}
				multiline
				onChange={(e) => {
					const inputType = (e.nativeEvent as any)?.inputType;
					const newText = e.nativeEvent.text;

					// Check if this is a paste operation with multiple lines
					if (inputType === "insertFromPaste" && onMultipleInstructionsPaste) {
						// Split by newlines and filter out empty lines
						const instructionLines = newText
							.split(/\r?\n/)
							.map((line) => line.trim())
							.filter((line) => line.length > 0);

						// If multiple lines were pasted, handle as multiple instructions
						if (instructionLines.length > 1) {
							onMultipleInstructionsPaste(instructionLines);
							return; // Don't call the regular onChange
						}
					}

					// Call the regular onChange for single-line content
					onChange(newText);
				}}
				onKeyPress={(e) => {
					// Detect Enter key press and save the instruction
					if (e.nativeEvent.key === "Enter" && parsedValue.trim()) {
						e.preventDefault(); // Prevent the newline from being inserted
						shouldSaveOnBlur.current = false; // Reset flag since we're saving immediately
						onSave();
					}
				}}
				onSubmitEditing={() => {
					shouldSaveOnBlur.current = false; // Reset flag since we're saving immediately
					onSave();
				}}
				autoCapitalize="sentences"
				autoCorrect={true}
				returnKeyType="done"
				onFocus={() => {
					shouldSaveOnBlur.current = false;
				}}
				onBlur={handleBlur}
				className="overflow-hidden max-h-[120px] text-start"
				style={{
					paddingRight: parsedValue ? 40 : 12, // Space for clear icon or no icons
				}}
			/>
			{!!parsedValue && !!onClear && (
				<Pressable
					onPressIn={() => {
						isDeleting.current = true;
					}}
					onFocus={() => {
						shouldSaveOnBlur.current = false;
					}}
					onBlur={handleBlur}
					onPress={() => {
						onClear();
					}}
					className="absolute right-2 top-0 bottom-0 w-8 justify-center items-center z-10"
					hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
				>
					<X size={16} className="text-muted-foreground" />
				</Pressable>
			)}
		</View>
	);
}
