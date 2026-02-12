import { View } from "react-native";
import React from "react";

interface ModeViewProps<T> {
	parsed: T;
	onEdit: () => void;
	renderParsed: (parsed: T, onEdit: () => void) => React.ReactNode;
}

export function ModeView<T>({
	parsed,
	onEdit,
	renderParsed,
}: ModeViewProps<T>) {
	return <View className="w-full">{renderParsed(parsed, onEdit)}</View>;
}
