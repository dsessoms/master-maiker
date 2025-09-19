import {
	EntityInput,
	EntityInputProps,
	EntityInputState,
	EntityInputValue,
} from "../entity-input";
import { Header, Instruction } from "@/lib/schemas";

import { KeyboardHint } from "@/components/ui/keyboard-hint";
import React from "react";
import { View } from "react-native";

export type InstructionOrHeader = Instruction | Header;

export type InstructionInputValue = EntityInputValue<InstructionOrHeader>;

export function InstructionInput({
	...props
}: EntityInputProps<InstructionOrHeader>) {
	return (
		<View className="relative w-full">
			<EntityInput<InstructionOrHeader> {...props} />
			<KeyboardHint
				keyLabel="enter"
				actionText="to save"
				show={
					props.value.state === EntityInputState.Dirty ||
					props.value.state === EntityInputState.Editing
				}
			/>
		</View>
	);
}
