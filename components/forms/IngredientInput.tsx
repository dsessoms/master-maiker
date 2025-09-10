import { Pressable, TextInput, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";

import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	interpolate,
} from "react-native-reanimated";
import { Input } from "../ui/input";
import { X } from "@/lib/icons/x";
import { Search } from "@/lib/icons/search";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchFoodModal } from "@/components/food/search-food-modal";

export enum EntityInputState {
	New = "new",
	Dirty = "dirty",
	Parsing = "parsing",
	Parsed = "parsed",
	Editing = "editing",
}

export type EntityInputValue<T> =
	| {
			state:
				| EntityInputState.New
				| EntityInputState.Dirty
				| EntityInputState.Parsing;
			raw: string;
			parsed?: T;
	  }
	| {
			state: EntityInputState.Parsed | EntityInputState.Editing;
			raw: string;
			parsed: T;
	  };

export interface EntityInputProps<T> {
	value: {
		state: EntityInputState;
		raw: string;
		parsed?: T;
	};
	placeholder?: string;
	onChange: (rawValue: string) => void;
	onSave: () => void;
	onEdit: () => void;
	onClear?: () => void;
	onFoodSelect?: (foodData: any) => void;
	renderParsed?: (parsed: T) => React.ReactNode;
	shouldFocus?: boolean;
	onFocus?: () => void;
}

export function EntityInput<T>({
	value,
	onChange,
	onSave,
	onEdit,
	onClear,
	onFoodSelect,
	renderParsed,
	placeholder,
	shouldFocus,
	onFocus,
}: EntityInputProps<T>) {
	const inputRef = useRef<TextInput>(null);
	const isPressingClear = useRef(false);
	const pulseAnimation = useSharedValue(0);
	const [showSearchModal, setShowSearchModal] = useState(false);

	const handleFoodSelect = (foodItem: any) => {
		if (onFoodSelect) {
			onFoodSelect(foodItem);
		}
		setShowSearchModal(false);
	};

	useEffect(() => {
		if (value.state === EntityInputState.Parsing) {
			pulseAnimation.value = withRepeat(
				withTiming(1, { duration: 350 }),
				-1,
				true,
			);
		} else {
			pulseAnimation.value = 0;
		}
	}, [value.state]);

	const animatedStyle = useAnimatedStyle(() => {
		const opacity = interpolate(pulseAnimation.value, [0, 1], [0.3, 0.7]);
		return {
			opacity,
		};
	});

	useEffect(() => {
		if (inputRef.current && value.state === EntityInputState.Editing) {
			inputRef.current.focus();
		}
	}, [value.state]);

	useEffect(() => {
		if (inputRef.current && shouldFocus) {
			inputRef.current.focus();
			onFocus?.();
		}
	}, [shouldFocus, onFocus]);

	if (value.state === EntityInputState.Parsing) {
		return <Skeleton className="h-[40px] w-full rounded-full" />;
	}
	if (value.state === EntityInputState.Parsed && value.parsed) {
		if (renderParsed) {
			return (
				<Pressable
					onPress={onEdit}
					style={{
						minHeight: 40,
						borderRadius: 4,
						marginBottom: 8,
						width: "100%",
						flexDirection: "row",
						alignItems: "center",
						paddingHorizontal: 8,
					}}
				>
					{renderParsed(value.parsed)}
				</Pressable>
			);
		}
		return null;
	}
	return (
		<View style={{ position: "relative", width: "100%" }}>
			<Input
				ref={inputRef}
				placeholder={placeholder}
				value={value.raw}
				onChangeText={onChange}
				onSubmitEditing={onSave}
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="done"
				onBlur={(e) => {
					// Add a small delay to allow onPressIn to set the flag first
					setTimeout(() => {
						if (!isPressingClear.current) {
							onSave();
						}
					}, 50);
				}}
				style={{
					paddingRight: onFoodSelect
						? value.raw
							? 80
							: 48 // Both icons or just search icon
						: value.raw
							? 40
							: 12, // Just clear icon or no icons
				}}
			/>
			{!!value.raw && !!onClear && (
				<Pressable
					tabIndex={-1}
					onPressIn={() => {
						isPressingClear.current = true;
					}}
					onPressOut={() => {
						isPressingClear.current = false;
					}}
					onPress={() => {
						onClear();
					}}
					style={{
						position: "absolute",
						right: 40,
						top: 0,
						bottom: 0,
						width: 32,
						justifyContent: "center",
						alignItems: "center",
						zIndex: 1,
					}}
					hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
				>
					<X size={16} className="text-muted-foreground" />
				</Pressable>
			)}
			{!!onFoodSelect && (
				<Pressable
					onPress={() => setShowSearchModal(true)}
					style={{
						position: "absolute",
						right: 8,
						top: 0,
						bottom: 0,
						width: 32,
						justifyContent: "center",
						alignItems: "center",
						zIndex: 1,
					}}
					hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
				>
					<Search size={16} className="text-muted-foreground" />
				</Pressable>
			)}
			{!!onFoodSelect && (
				<SearchFoodModal
					visible={showSearchModal}
					onClose={() => setShowSearchModal(false)}
					addFoodItem={handleFoodSelect}
				/>
			)}
		</View>
	);
}
