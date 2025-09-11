import { Text } from "../ui/text";
import { View } from "react-native";

const displayValue = (value: number | null | undefined, scale: number) => {
	return Math.round(Number(value) * scale);
};

export interface MacroProps {
	calories?: number | null;
	carbohydrate?: number | null;
	protein?: number | null;
	fat?: number | null;
	scale?: number;
}

export const Macros = ({
	calories,
	carbohydrate,
	protein,
	fat,
	scale = 1,
}: MacroProps) => {
	const values = [
		["cals", "calories", displayValue(calories, scale), ""],
		["c", "carbs", displayValue(carbohydrate, scale), "g"],
		["p", "protein", displayValue(protein, scale), "g"],
		["f", "fat", displayValue(fat, scale), "g"],
	];
	return (
		<View style={{ flexDirection: "row" }}>
			{values.map(([macro, longMacro, amount, unit]) => (
				<View key={macro} style={{ marginRight: 12, alignItems: "center" }}>
					<Text
						style={{ fontSize: 12, color: "#888" }}
					>{`${macro}: ${amount}${unit}`}</Text>
				</View>
			))}
		</View>
	);
};
