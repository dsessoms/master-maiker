import { Text } from "@/components/ui/text";
import { View } from "react-native";

interface HeaderProps {
	name: string;
}

export function Header({ name }: HeaderProps) {
	return (
		<View className="py-1">
			<Text className="font-semibold text-foreground">{name}</Text>
		</View>
	);
}
