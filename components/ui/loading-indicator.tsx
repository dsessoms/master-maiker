import { ActivityIndicator } from "react-native";
import type { ActivityIndicatorProps } from "react-native";
import { useTheme } from "@/context/theme-context";

export const LoadingIndicator = ({ ...props }: ActivityIndicatorProps) => {
	const { colors } = useTheme();

	return <ActivityIndicator size="large" color={colors.primary} {...props} />;
};
