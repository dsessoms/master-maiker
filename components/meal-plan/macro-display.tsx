import { NutritionTotals } from "@/lib/utils/nutrition-calculator";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { cn } from "@/lib/utils";

interface MacroDisplayProps {
	nutrition: NutritionTotals;
	showLabel?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export const MacroDisplay = ({
	nutrition,
	showLabel = false,
	size = "md",
	className,
}: MacroDisplayProps) => {
	const sizeClasses = {
		sm: "text-xs",
		md: "text-sm",
		lg: "text-base",
	};

	const textClass = sizeClasses[size];

	// Only show if there are non-zero values
	if (
		nutrition.calories === 0 &&
		nutrition.protein === 0 &&
		nutrition.carbohydrate === 0 &&
		nutrition.fat === 0
	) {
		return null;
	}

	return (
		<View className={cn("flex-row items-center gap-2 flex-wrap", className)}>
			{showLabel && (
				<Text className={cn(textClass, "font-semibold text-muted-foreground")}>
					Nutrition:
				</Text>
			)}
			<View className="flex-row items-center gap-3">
				{nutrition.calories > 0 && (
					<View className="flex-row items-center gap-1">
						<Text className={cn(textClass, "font-semibold")}>
							{nutrition.calories}
						</Text>
						<Text className={cn(textClass, "text-muted-foreground")}>cal</Text>
					</View>
				)}
				{nutrition.protein > 0 && (
					<View className="flex-row items-center gap-1">
						<Text className={cn(textClass, "font-semibold text-blue-600")}>
							{nutrition.protein}g
						</Text>
						<Text className={cn(textClass, "text-muted-foreground")}>P</Text>
					</View>
				)}
				{nutrition.carbohydrate > 0 && (
					<View className="flex-row items-center gap-1">
						<Text className={cn(textClass, "font-semibold text-amber-600")}>
							{nutrition.carbohydrate}g
						</Text>
						<Text className={cn(textClass, "text-muted-foreground")}>C</Text>
					</View>
				)}
				{nutrition.fat > 0 && (
					<View className="flex-row items-center gap-1">
						<Text className={cn(textClass, "font-semibold text-red-600")}>
							{nutrition.fat}g
						</Text>
						<Text className={cn(textClass, "text-muted-foreground")}>F</Text>
					</View>
				)}
			</View>
		</View>
	);
};
