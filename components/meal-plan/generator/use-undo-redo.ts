import { useCallback, useState } from "react";

interface UndoRedoState<T> {
	past: T[];
	future: T[];
}

interface UseUndoRedoReturn<T> {
	push: (current: T) => void;
	undo: (current: T) => T | null;
	redo: (current: T) => T | null;
	canUndo: boolean;
	canRedo: boolean;
	clear: () => void;
}

export function useUndoRedo<T>(): UseUndoRedoReturn<T> {
	const [{ past, future }, setState] = useState<UndoRedoState<T>>({
		past: [],
		future: [],
	});

	/** Record a new state. Clears the redo future. */
	const push = useCallback((current: T) => {
		setState((prev) => ({
			past: [...prev.past, current],
			future: [],
		}));
	}, []);

	/**
	 * Undo: moves `current` onto the future stack and returns the previous
	 * state, or null if there is nothing to undo.
	 */
	const undo = useCallback((current: T): T | null => {
		let prev: T | null = null;
		setState((s) => {
			if (s.past.length === 0) return s;
			prev = s.past[s.past.length - 1];
			return {
				past: s.past.slice(0, -1),
				future: [current, ...s.future],
			};
		});
		return prev;
	}, []);

	/**
	 * Redo: moves `current` onto the past stack and returns the next state,
	 * or null if there is nothing to redo.
	 */
	const redo = useCallback((current: T): T | null => {
		let next: T | null = null;
		setState((s) => {
			if (s.future.length === 0) return s;
			next = s.future[0];
			return {
				past: [...s.past, current],
				future: s.future.slice(1),
			};
		});
		return next;
	}, []);

	const clear = useCallback(() => {
		setState({ past: [], future: [] });
	}, []);

	return {
		push,
		undo,
		redo,
		canUndo: past.length > 0,
		canRedo: future.length > 0,
		clear,
	};
}
