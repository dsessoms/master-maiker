import { Text } from "../ui/text";
import { View } from "react-native";

interface InstructionProps {
	index: number;
	value: string;
}

export function Instruction({ index, value }: InstructionProps) {
	return (
		<View className="mb-4 flex flex-row">
			<Text className="font-semibold text-base mr-3 text-primary">
				{index + 1}.
			</Text>
			<Text className="flex-1 text-base leading-6">{value}</Text>
		</View>
	);
}
