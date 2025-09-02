import { Apple, Egg, Hamburger, Plus, Salad } from "../../lib/icons";

import { Button } from "../ui/button";
import { FoodEntry } from "./food-entry";
import { Text } from "../ui/text";
import { View } from "react-native";
import { cn } from "../../lib/utils";

type MealType = "breakfast" | "lunch" | "dinner" | "snack"; // TODO: replace with real type

const MealTypeIcon = {
	breakfast: <Egg className="mb-1 h-4 w-4" />,
	lunch: <Hamburger className="mb-1 h-4 w-4" />,
	dinner: <Salad className="mb-1 h-4 w-4" />,
	snack: <Apple className="mb-1 h-4 w-4" />,
};

export const MealSection = ({
	mealType,
	foodEntries,
	onAdd,
}: {
	mealType: MealType;
	foodEntries?: any[];
	onAdd: () => void;
}) => {
	return (
		<View className="flex flex-row flex-1">
			<View className="flex flex-col items-center pr-2 pt-[6px]">
				{MealTypeIcon[mealType]}
				<View className={cn("w-1 flex-1 rounded-full", "bg-accent")} />
			</View>
			<View className="flex min-w-0 flex-1 flex-col">
				<View className="mb-3 flex flex-col">
					<View className="flex flex-row flex-1 justify-between">
						<Text className="mr-2 w-24 text-lg font-semibold">{mealType}</Text>
						<Button
							size="icon"
							onPress={onAdd}
							variant="secondary"
							className="md:hidden rounded-full"
						>
							<Plus className="h-4 w-4 max-h-4 max-w-4" />
						</Button>
					</View>
				</View>
				<View className="space-y-4">
					{(!foodEntries || foodEntries.length === 0) && (
						<Text className="text-sm text-base-content/50">
							No {mealType.toLowerCase()} items added
						</Text>
					)}
					{foodEntries?.map((entry: any) => (
						<FoodEntry key={entry.id} entry={entry} />
					))}
					<Button
						onPress={onAdd}
						variant="secondary"
						size="sm"
						className="hidden md:flex md:flex-row max-w-32"
					>
						<Plus className="h-4 w-4" />
						<Text>Add</Text>
					</Button>
				</View>
			</View>
		</View>
	);
};
