import { ActivityIndicator } from "react-native";
import type { ActivityIndicatorProps } from "react-native";
import { colors } from "@/constants/colors";
import { useTheme } from "@/context/theme-context";

export const LoadingIndicator = ({
	themeColor = "primary",
	...props
}: ActivityIndicatorProps & {
	themeColor?: keyof (typeof colors)["light"];
}) => {
	const { colors } = useTheme();

	return (
		<ActivityIndicator size="large" color={colors[themeColor]} {...props} />
	);
};
