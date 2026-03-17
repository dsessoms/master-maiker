import {
	Pressable,
	ScrollView,
	TextInput,
	View,
	Platform,
	BackHandler,
	useWindowDimensions,
	type LayoutChangeEvent,
	type LayoutRectangle,
} from "react-native";
import { Portal } from "@rn-primitives/portal";
import { type LayoutPosition } from "@rn-primitives/hooks";
import { Text } from "./text";
import { useState, useRef, useEffect, useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { X, Trash2 } from "lucide-react-native";
import { Icon } from "./icon";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./dialog";
import { Button } from "./button";

export interface MultiSelectOption {
	label: string;
	value: string;
}

interface MultiSelectProps {
	options: MultiSelectOption[];
	selectedValues: string[];
	onValuesChange: (values: string[]) => void;
	placeholder?: string;
	emptyMessage?: string;
	allowCreate?: boolean;
	onCreateOption?: (label: string) => void;
	onDeleteOption?: (value: string) => void;
	disabled?: boolean;
	className?: string;
}

export function MultiSelect({
	options,
	selectedValues,
	onValuesChange,
	placeholder = "Select options...",
	emptyMessage = "No options found.",
	allowCreate = false,
	onCreateOption,
	onDeleteOption,
	disabled = false,
	className,
}: MultiSelectProps) {
	const nativeID = useId();
	const { height: windowHeight } = useWindowDimensions();
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [triggerPosition, setTriggerPosition] = useState<LayoutPosition | null>(
		null,
	);
	const [contentLayout, setContentLayout] = useState<LayoutRectangle | null>(
		null,
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [optionToDelete, setOptionToDelete] =
		useState<MultiSelectOption | null>(null);

	const containerRef = useRef<View>(null);
	const inputRef = useRef<TextInput>(null);

	// Calculate preferred side based on available space
	const preferredSide = useMemo(() => {
		if (!triggerPosition || !contentLayout) return "bottom";

		const spaceBelow =
			windowHeight - (triggerPosition.pageY + triggerPosition.height);
		const spaceAbove = triggerPosition.pageY;
		const dropdownHeight = contentLayout.height;

		// If there's not enough space below but enough space above, flip it
		if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
			return "top";
		}

		return "bottom";
	}, [triggerPosition, contentLayout, windowHeight]);

	// Handle hardware back button
	useEffect(() => {
		if (!isOpen) return;

		const backHandler = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				handleClose();
				return true;
			},
		);

		return () => {
			backHandler.remove();
		};
	}, [isOpen]);

	// Focus input when opened
	useEffect(() => {
		if (isOpen && inputRef.current) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		}
	}, [isOpen]);

	// Get selected options from the options array
	const selectedOptions = options.filter((opt) =>
		selectedValues.includes(opt.value),
	);

	const filteredOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const exactMatch = filteredOptions.some(
		(opt) => opt.label.toLowerCase() === searchQuery.toLowerCase(),
	);

	const canCreate =
		allowCreate &&
		searchQuery.trim() !== "" &&
		!exactMatch &&
		onCreateOption !== undefined;

	const selectOption = (value: string) => {
		if (selectedValues.includes(value)) {
			return;
		} else {
			onValuesChange([...selectedValues, value]);
		}
	};

	const deselectOption = (value: string) => {
		if (!selectedValues.includes(value)) {
			return;
		} else {
			onValuesChange(selectedValues.filter((v) => v !== value));
		}
	};

	const toggleOption = (value: string) => {
		if (selectedValues.includes(value)) {
			deselectOption(value);
		} else {
			selectOption(value);
		}
	};

	const removeOption = (value: string) => {
		onValuesChange(selectedValues.filter((v) => v !== value));
	};

	const handleCreateOption = () => {
		if (canCreate && onCreateOption) {
			const trimmedValue = searchQuery.trim();
			// Clear search first
			setSearchQuery("");
			// Call the callback to handle the creation
			onCreateOption(trimmedValue);
		}
	};

	const handleKeyPress = () => {
		const trimmedQuery = searchQuery.trim();
		if (!trimmedQuery) return;

		// Check for exact match first
		const exactMatchOption = options.find(
			(opt) => opt.label.toLowerCase() === trimmedQuery.toLowerCase(),
		);

		if (exactMatchOption) {
			// Select the exact match
			toggleOption(exactMatchOption.value);
			setSearchQuery("");
		} else if (allowCreate) {
			// No exact match, create new option if allowed
			handleCreateOption();
		}

		// Refocus the input
		setTimeout(() => {
			inputRef.current?.focus();
		}, 50);
	};

	const handleClose = () => {
		setIsOpen(false);
		setSearchQuery("");
		setTriggerPosition(null);
		setContentLayout(null);
	};

	const handleDeleteClick = (option: MultiSelectOption) => {
		setOptionToDelete(option);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = () => {
		if (optionToDelete && onDeleteOption) {
			onDeleteOption(optionToDelete.value);
			// Also remove from selected values if it was selected
			if (selectedValues.includes(optionToDelete.value)) {
				removeOption(optionToDelete.value);
			}
		}
		setDeleteDialogOpen(false);
		setOptionToDelete(null);
	};

	const cancelDelete = () => {
		setDeleteDialogOpen(false);
		setOptionToDelete(null);
	};

	const handleOpen = () => {
		if (disabled) return;
		containerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
			setTriggerPosition({ width, pageX, pageY, height });
			setIsOpen(true);
		});
	};

	const onContentLayout = (event: LayoutChangeEvent) => {
		setContentLayout(event.nativeEvent.layout);
	};

	// Render component
	return (
		<>
			{/* Main trigger - always visible */}
			<Pressable
				ref={containerRef}
				onPress={handleOpen}
				disabled={disabled}
				className={cn(
					"bg-background flex min-h-10 flex-row flex-wrap items-center gap-2 py-2",
					disabled && "opacity-50",
					className,
				)}
			>
				{selectedOptions.length === 0 ? (
					<Text className="text-muted-foreground text-sm">{placeholder}</Text>
				) : (
					<>
						{selectedOptions.map((option) => (
							<View
								key={option.value}
								className="bg-muted flex-row items-center gap-1 rounded-md px-2 py-1"
							>
								<Text className="text-foreground text-sm font-medium">
									{option.label}
								</Text>
							</View>
						))}
					</>
				)}
			</Pressable>

			{/* Dropdown portal - overlays the trigger */}
			{isOpen && triggerPosition && (
				<Portal name={`${nativeID}_multi-select`}>
					{/* Backdrop overlay */}
					<Pressable
						onPress={handleClose}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
						}}
					/>

					{/* Dropdown that overlays the trigger - positioned exactly over it */}
					<View
						style={{
							position: "absolute",
							top: triggerPosition.pageY,
							left: triggerPosition.pageX,
							width: triggerPosition.width,
							zIndex: 50,
						}}
					>
						{/* Input container with chips - replaces the trigger visually */}
						<View
							className={cn(
								"border-input bg-background flex min-h-10 flex-row flex-wrap items-center gap-2 rounded-md border px-3 py-2 shadow-sm shadow-black/5",
								Platform.select({
									web: "ring-ring/50 ring-2",
								}),
							)}
						>
							{/* Selected chips inside */}
							{selectedOptions.map((option) => (
								<View
									key={option.value}
									className="bg-muted flex-row items-center gap-1 rounded-md px-2 py-1"
								>
									<Text className="text-foreground text-sm font-medium">
										{option.label}
									</Text>
									<Pressable
										onPress={() => removeOption(option.value)}
										hitSlop={8}
										className="ml-1"
									>
										<Icon as={X} size={14} className="text-foreground/70" />
									</Pressable>
								</View>
							))}

							{/* Input field */}
							<TextInput
								ref={inputRef}
								value={searchQuery}
								onChangeText={setSearchQuery}
								onSubmitEditing={handleKeyPress}
								placeholder={
									selectedOptions.length === 0 ? "Search for an option..." : ""
								}
								placeholderTextColor="#9CA3AF"
								className={cn(
									"text-foreground flex-1 text-base",
									Platform.select({
										web: "outline-none",
									}),
								)}
								style={{ minWidth: 120 }}
							/>
						</View>

						{/* Options dropdown below the input */}
						<View
							style={[
								{
									position: "absolute",
									top: "100%",
									left: 0,
									right: 0,
									marginTop: 4,
								},
								preferredSide === "top" && {
									top: "auto",
									bottom: "100%",
									marginTop: 0,
									marginBottom: 4,
								},
							]}
							onLayout={onContentLayout}
						>
							<View className="bg-popover border-border overflow-hidden rounded-md border shadow-lg">
								<ScrollView
									className="max-h-64 p-1"
									keyboardShouldPersistTaps="handled"
								>
									{filteredOptions.length === 0 && !canCreate ? (
										<View className="py-6">
											<Text className="text-muted-foreground text-center text-sm">
												{emptyMessage}
											</Text>
										</View>
									) : (
										<>
											{filteredOptions.map((option) => {
												return (
													<View
														key={option.value}
														className="flex-row items-center gap-2"
													>
														<Pressable
															onPress={() => selectOption(option.value)}
															className={cn(
																"flex-1 flex-row items-center gap-2 rounded-sm px-2 py-2",
															)}
														>
															<View className="bg-muted flex-row items-center gap-1 rounded-md px-2 py-1">
																<Text className="text-foreground text-sm font-medium">
																	{option.label}
																</Text>
															</View>
														</Pressable>
														{onDeleteOption && (
															<Pressable
																onPress={() => handleDeleteClick(option)}
																hitSlop={8}
																className="px-2 py-2"
															>
																<Icon
																	as={Trash2}
																	size={16}
																	className="text-destructive"
																/>
															</Pressable>
														)}
													</View>
												);
											})}
											{canCreate && (
												<Pressable
													onPress={handleCreateOption}
													className="flex-row items-center gap-2 rounded-sm border-t border-border px-2 py-2"
												>
													<Text className="text-foreground text-sm">
														Create &quot;{searchQuery}&quot;
													</Text>
												</Pressable>
											)}
										</>
									)}
								</ScrollView>
							</View>
						</View>
					</View>
				</Portal>
			)}

			{/* Delete confirmation dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Option</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &quot;{optionToDelete?.label}
							&quot;? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onPress={cancelDelete}>
							<Text>Cancel</Text>
						</Button>
						<Button variant="destructive" onPress={confirmDelete}>
							<Text>Delete</Text>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
