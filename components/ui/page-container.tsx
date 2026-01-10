import { View, ViewProps } from "react-native";

export const PageContainer = ({ children }: ViewProps) => {
	return (
		<View className="flex flex-1 bg-background items-center">
			<View className="flex flex-1 max-w-3xl">{children}</View>
		</View>
	);
};
