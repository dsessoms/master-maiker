import { ExpandedRecipe } from "../../types";
import { Text } from "../ui/text";
import { View } from "react-native";

interface MacrosProps {
	recipe: ExpandedRecipe;
}

export function Macros({ recipe }: MacrosProps) {
	const macros = recipe?.macros[0];

	if (!macros) {
		return (
			<View>
				<Text className="text-lg font-semibold mb-2">
					Nutrition per serving
				</Text>
				<Text className="text-sm text-muted-foreground">
					Nutrition information not available
				</Text>
			</View>
		);
	}

	const nutritionData = [
		{ label: "Calories", value: macros.calories, unit: "" },
		{ label: "Protein", value: macros.protein, unit: "g" },
		{ label: "Carbs", value: macros.carbohydrate, unit: "g" },
		{ label: "Fat", value: macros.fat, unit: "g" },
		...(macros.fiber != null
			? [{ label: "Fiber", value: macros.fiber, unit: "g" }]
			: []),
		...(macros.sugar != null
			? [{ label: "Sugar", value: macros.sugar, unit: "g" }]
			: []),
	];

	return (
		<View>
			<Text className="text-lg font-semibold mb-3">Nutrition per serving</Text>
			<View className="border border-border rounded-lg overflow-hidden">
				{nutritionData.map((item, index) => (
					<View
						key={item.label}
						className={`flex flex-row justify-between px-4 py-3 ${
							index % 2 === 0 ? "bg-muted/30" : "bg-background"
						}`}
					>
						<Text className="text-base">{item.label}</Text>
						<Text className="text-base font-medium">
							{item.value != null
								? `${Math.round(item.value)}${item.unit}`
								: "—"}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}
