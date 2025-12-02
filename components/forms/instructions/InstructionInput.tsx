import { Header, Instruction } from "@/lib/schemas";
import {
	StatefulInput,
	StatefulInputProps,
	StatefulInputState,
	StatefulInputValue,
} from "../stateful-input/stateful-input";

import { KeyboardHint } from "@/components/ui/keyboard-hint";
import React from "react";
import { View } from "react-native";

export type InstructionOrHeader = Instruction | Header;

export type InstructionInputValue = StatefulInputValue<InstructionOrHeader>;

export function InstructionInput({
	...props
}: StatefulInputProps<InstructionOrHeader>) {
	return (
		<View className="relative w-full">
			<StatefulInput<InstructionOrHeader> {...props} />
			<KeyboardHint
				keyLabel="enter"
				actionText="to save"
				show={props.value.state === StatefulInputState.Edit}
			/>
		</View>
	);
}
