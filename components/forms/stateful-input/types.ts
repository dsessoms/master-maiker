import { ReactNode } from "react";

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
	renderParsed?: (parsed: ParsedType, onEdit: () => void) => ReactNode;
	renderCustomEditor?: () => ReactNode;
}
