import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { useEffect } from "react";

export function useAppState(onChange: (status: AppStateStatus) => void) {
	useEffect(() => {
		const subscription = AppState.addEventListener("change", onChange);
		return () => {
			subscription.remove();
		};
	}, [onChange]);
}
