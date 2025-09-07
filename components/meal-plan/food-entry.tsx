import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { View } from "react-native";
import { useState } from "react";

const StaticFoodEntry = ({
	entry,
	onEditClick,
	onDeleteClick,
}: {
	entry: any;
	onEditClick: () => void;
	onDeleteClick: () => void;
}) => {
	// const { createFoodEntries } = useCreateFoodEntriesMutation();
	const foodName =
		entry.food?.food_name +
		(entry.food?.brand_name ? ` (${entry.food?.brand_name})` : "");
	return (
		<View style={{ flex: 1, flexDirection: "column", gap: 4 }}>
			<Text style={{ fontSize: 18 }}>{entry.recipe?.name ?? foodName}</Text>
		</View>
	);
};

export const FoodEntry = ({ entry }: { entry: any }) => {
	const [isEditing, setIsEditing] = useState(false);
	// Drag and drop logic omitted for Expo/React Native
	return (
		<View style={{ flex: 1, flexDirection: "row", gap: 8, marginBottom: 8 }}>
			<View>
				<Text>Food Entry: {entry.recipe_id}</Text>
			</View>
		</View>
	);
};
