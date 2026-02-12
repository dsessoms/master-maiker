import { View } from "react-native";
import React from "react";

// Types
import { StatefulInputProps, StatefulInputState } from "./types";
import { ModeLoading } from "./mode-loading";
import { ModeView } from "./mode-view";
import { ModeEditor } from "./mode-editor";

// Re-export types for backward compatibility or ease of use
export * from "./types";

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
}: StatefulInputProps<ParsedType>) {
	if (value.state === StatefulInputState.Load) {
		return <ModeLoading />;
	}

	if (value.state === StatefulInputState.View && value.parsed) {
		if (renderParsed) {
			return (
				<ModeView<ParsedType>
					parsed={value.parsed}
					onEdit={onEdit}
					renderParsed={renderParsed}
				/>
			);
		}
		return null;
	}

	if (renderCustomEditor) {
		return <View className="relative w-full">{renderCustomEditor()}</View>;
	}

	return (
		<ModeEditor
			state={value.state}
			raw={value.raw}
			placeholder={placeholder}
			onChange={onChange}
			onMultiplePaste={onMultiplePaste}
			onSave={onSave}
			onClear={onClear}
			onSearch={onSearch}
		/>
	);
}
