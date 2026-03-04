import * as React from "react";
import {
	NativeSyntheticEvent,
	TextInput,
	TextInputContentSizeChangeEventData,
	type TextInputProps,
} from "react-native";
import { cn } from "@/lib/utils";
import { useState } from "react";

const lineHeight = 28;

const Textarea = React.forwardRef<
	React.ComponentRef<typeof TextInput>,
	TextInputProps
>(({ className, multiline = true, placeholderClassName, ...props }, ref) => {
	const [numberOfLines, setNumberOflines] = useState(1);

	const onContentSizeChange = (
		e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
	) => {
		const newNumberOfLines = Math.ceil(
			e.nativeEvent.contentSize.height / lineHeight,
		);

		setNumberOflines(newNumberOfLines);
	};

	return (
		<TextInput
			onContentSizeChange={onContentSizeChange}
			ref={ref}
			className={cn(
				"web:flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground web:ring-offset-background placeholder:text-muted-foreground web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
				props.editable === false && "opacity-50 web:cursor-not-allowed",
				className,
			)}
			placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
			multiline={multiline}
			textAlignVertical="top"
			numberOfLines={numberOfLines}
			{...props}
		/>
	);
});

Textarea.displayName = "Textarea";

export { Textarea };
