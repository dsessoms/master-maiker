import { Platform } from "react-native";
import React from "react";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export interface KeyboardHintProps {
	keyLabel: string;
	actionText: string;
	show?: boolean;
	className?: string;
}

export function KeyboardHint({
	keyLabel,
	actionText,
	show = true,
	className,
}: KeyboardHintProps) {
	// Only show on web platform
	if (Platform.OS !== "web" || !show) {
		return null;
	}

	return (
		<Text
			className={cn(
				"text-xs text-muted-foreground mt-2 px-2 self-end",
				className,
			)}
		>
			<Text className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-300 dark:border-gray-600 mr-1">
				{keyLabel}
			</Text>
			{actionText}
		</Text>
	);
}
