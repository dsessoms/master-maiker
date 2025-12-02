import { Pressable, TextInput, View } from "react-native";
import React, { useEffect, useRef } from "react";

import { Input } from "../../ui/input";
import { Search } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "@/lib/icons/x";
import { cn } from "@/lib/utils";

export enum StatefulInputState {
	New = "new",
	Load = "load",
	View = "view",
	Edit = "edit",
}

export type StatefulInputValue<T> =
	| {
			state:
				| StatefulInputState.New
				| StatefulInputState.Load
				| StatefulInputState.Edit;
			raw: string;
			parsed?: T;
	  }
	| {
			state: StatefulInputState.View;
			raw: string;
			parsed: T;
	  };

export interface StatefulInputProps<ParsedType> {
	value: {
		state: StatefulInputState;
		raw: string;
		parsed?: ParsedType;
	};
	placeholder?: string;
	onChange: (rawValue: string) => void;
	onSave: () => void;
	onEdit: () => void;
	onCancel?: () => void;
	onClear?: () => void;
	onSearch?: () => void;
	onMultiplePaste?: (lines: string[]) => void;
	renderParsed?: (parsed: ParsedType) => React.ReactNode;
	renderCustomEditor?: () => React.ReactNode;
	shouldFocus?: boolean;
	onFocus?: () => void;
}

export function StatefulInput<ParsedType>({
	value,
	onChange,
	onSave,
	onEdit,
	onClear,
	onSearch,
	onMultiplePaste,
	renderParsed,
	renderCustomEditor,
	placeholder,
	shouldFocus,
	onFocus,
}: StatefulInputProps<ParsedType>) {
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

	if (value.state === StatefulInputState.Load) {
		return <Skeleton className="h-[40px] w-full rounded-md" />;
	}

	if (value.state === StatefulInputState.View && value.parsed) {
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

	if (renderCustomEditor) {
		return <View className="relative w-full">{renderCustomEditor()}</View>;
	}

	return (
		<View className="relative w-full">
			<Input
				ref={inputRef}
				placeholder={placeholder}
				value={value.raw}
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
					if (e.nativeEvent.key === "Enter" && value.raw.trim()) {
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
			{!!value.raw && !!onClear && (
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
