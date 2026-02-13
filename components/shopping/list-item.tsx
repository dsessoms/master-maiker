import { Pressable, View } from "react-native";

import { Checkbox } from "@/components/ui/checkbox";
import { ConsolidatedItemType } from "@/components/shopping/types";
import { Image } from "@/components/image";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { getServingDescription } from "@/lib/utils/serving-description";
import { useShoppingListItems } from "@/hooks/shopping-lists/use-shopping-list-items";

export const ListItem = ({
	listId,
	item,
	onClick,
}: {
	listId: string;
	item: ConsolidatedItemType;
	onClick: () => void;
}) => {
	const { updateItem } = useShoppingListItems(listId);

	// Build display text
	const displayName = item.name || item.food?.food_name || "Unknown item";
	const servingInfo =
		item.serving && item.number_of_servings
			? getServingDescription(item.number_of_servings, item.serving)
			: null;

	// Handle checkbox for consolidated items - update all consolidated IDs
	const handleCheckChange = async () => {
		const newCheckedState = !item.is_checked;
		const idsToUpdate = item.consolidatedIds || [item.id];

		// Update all consolidated items
		await Promise.all(
			idsToUpdate.map((id) =>
				updateItem({
					id,
					isChecked: newCheckedState,
				}),
			),
		);
	};

	return (
		<Pressable
			onPress={onClick}
			className="flex-row items-center gap-3 rounded-md bg-card p-3"
		>
			{item.food?.image_url && (
				<Image
					source={{ uri: item.food.image_url }}
					className={cn("h-7 w-7 rounded-md", item.is_checked && "opacity-30")}
					contentFit="contain"
				/>
			)}
			<View className="flex-1">
				<View className="flex-row flex-wrap gap-1">
					{servingInfo && (
						<Text
							className={
								item.is_checked
									? "font-semibold text-muted-foreground line-through"
									: "font-semibold"
							}
						>
							{servingInfo}
						</Text>
					)}
					<Text
						className={
							item.is_checked ? "text-muted-foreground line-through" : undefined
						}
					>
						{displayName}
					</Text>
					{item.meta && (
						<Text
							className={
								item.is_checked
									? "text-muted-foreground line-through"
									: "text-muted-foreground"
							}
						>
							({item.meta})
						</Text>
					)}
				</View>
				{item.notes && (
					<Text className="text-sm text-muted-foreground">{item.notes}</Text>
				)}
			</View>
			<Checkbox
				checked={item.is_checked ?? false}
				onCheckedChange={handleCheckChange}
			/>
		</Pressable>
	);
};
