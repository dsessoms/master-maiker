import { useCallback, useState } from "react";

export function useToggle(
	initialValue: boolean = false,
): [boolean, () => void, (value: boolean) => void] {
	const [state, setState] = useState<boolean>(initialValue);

	const toggle = useCallback(() => {
		setState((prev) => !prev);
	}, []);

	const setValue = useCallback((value: boolean) => {
		setState(value);
	}, []);

	return [state, toggle, setValue];
}
