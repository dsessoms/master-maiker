import { Pressable, TextInput, View } from "react-native";
import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "@/lib/icons";
import { X } from "@/lib/icons/x";
import { cn } from "@/lib/utils";
import { StatefulInputState } from "@/components/forms/stateful-input/types";

interface ModeEditorProps {
	state: StatefulInputState;
	raw: string;
	placeholder?: string;
	onChange: (value: string) => void;
	onMultiplePaste?: (lines: string[]) => void;
	onSave: () => void;
	onClear?: () => void;
	onSearch?: () => void;
	shouldFocus?: boolean;
	onFocus?: () => void;
}

export function ModeEditor({
	state,
	raw,
	placeholder,
	onChange,
	onMultiplePaste,
	onSave,
	onClear,
	onSearch,
	shouldFocus,
	onFocus,
}: ModeEditorProps) {
	const inputRef = useRef<TextInput>(null);
	const shouldSaveOnBlur = useRef(false);
	const isDeleting = useRef(false);
	const isSearching = useRef(false);

	// Helper function to handle blur logic with conditional saving
	const handleBlur = () => {
		shouldSaveOnBlur.current = true;

		setTimeout(() => {
			if (
				shouldSaveOnBlur.current &&
				!isDeleting.current &&
				!isSearching.current
			) {
				onSave();
			}
			shouldSaveOnBlur.current = false;
		}, 50);
	};

	useEffect(() => {
		if (inputRef.current && state === StatefulInputState.Edit) {
			// Small delay to ensure the input is properly rendered before focusing
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
			onFocus?.();
		}
	}, [onFocus]);

	return (
		<View className="relative w-full">
			<Input
				// autoFocus={state === StatefulInputState.Edit}
				ref={inputRef}
				placeholder={placeholder}
				value={raw}
				multiline
				onChange={(e) => {
					const inputType = (e.nativeEvent as any)?.inputType;
					const newText = e.nativeEvent.text;

					// Check if this is a paste operation with multiple lines
					if (inputType === "insertFromPaste" && onMultiplePaste) {
						// Split by newlines and filter out empty lines
						const lines = newText
							.split(/\r?\n/)
							.map((line) => line.trim())
							.filter((line) => line.length > 0);

						// If multiple lines were pasted
						if (lines.length > 1) {
							onMultiplePaste(lines);
							return; // Don't call the regular onChange
						}
					}

					// Call the regular onChange for single-line content
					onChange(newText);
				}}
				onKeyPress={(e) => {
					// Detect Enter key press and save the ingredient
					if (e.nativeEvent.key === "Enter" && raw.trim()) {
						e.preventDefault(); // Prevent the newline from being inserted
						shouldSaveOnBlur.current = false; // Reset flag since we're saving immediately
						onSave();
					}
				}}
				onSubmitEditing={() => {
					shouldSaveOnBlur.current = false; // Reset flag since we're saving immediately
					onSave();
				}}
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="done"
				onFocus={() => {
					shouldSaveOnBlur.current = false;
				}}
				onBlur={handleBlur}
				className="overflow-hidden ios:pt-3"
			/>
			{!!raw && !!onClear && (
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
					className={cn({
						"absolute top-0 bottom-0 w-8 justify-center items-center z-10":
							true,
						"right-10": !!onSearch,
						"right-2": !onSearch,
					})}
					hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
				>
					<X size={16} className="text-muted-foreground" />
				</Pressable>
			)}
			{!!onSearch && (
				<Pressable
					onPressIn={() => {
						isSearching.current = true;
						shouldSaveOnBlur.current = false;
					}}
					onFocus={() => {
						shouldSaveOnBlur.current = false;
					}}
					onBlur={handleBlur}
					onPress={onSearch}
					className="absolute right-2 top-0 bottom-0 w-8 justify-center items-center z-10"
					hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
				>
					<Search size={16} className="text-muted-foreground" />
				</Pressable>
			)}
		</View>
	);
}
