import {
	EntityInput,
	EntityInputProps,
	EntityInputState,
	EntityInputValue,
} from "../entity-input";
import { Header, Instruction } from "@/lib/schemas";

import React from "react";

export type InstructionOrHeader = Instruction | Header;

export type InstructionInputValue = EntityInputValue<InstructionOrHeader>;

export function InstructionInput({
	...props
}: EntityInputProps<InstructionOrHeader>) {
	return <EntityInput<InstructionOrHeader> {...props} />;
}
