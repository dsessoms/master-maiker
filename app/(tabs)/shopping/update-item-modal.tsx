"use client";

import * as React from "react";

import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ConsolidatedItemType } from "./types";
import { GetShoppingListItemsResponse } from "@/app/api/shopping-lists/[id]/items/index+api";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Trash2Icon } from "@/lib/icons";
import { View } from "react-native";
import { useDeleteShoppingListItemMutation } from "@/hooks/shopping-lists/use-delete-shopping-list-item-mutation";
import { useShoppingListItems } from "@/hooks/shopping-lists/use-shopping-list-items";

type ItemType = NonNullable<GetShoppingListItemsResponse["items"]>[0];

const getServingDescription = (
	numberOfServings: number,
	serving: {
		measurement_description: string | null;
		number_of_units: number | null;
	},
) => {
	if (!serving.number_of_units) {
		return `${numberOfServings} ${serving.measurement_description || "serving"}`;
	}

	const totalUnits = numberOfServings * serving.number_of_units;
	return serving.measurement_description
		? `${totalUnits} ${serving.measurement_description}`
		: totalUnits.toString();
};

export const UpdateItemModal = ({
	shoppingListId,
	item,
	isOpen,
	onClose,
}: {
	shoppingListId: string;
	item: ConsolidatedItemType;
	isOpen: boolean;
	onClose: () => void;
}) => {
	// For items with a food reference, display the food name with serving info but treat it as read-only
	const isIngredientItem = !item.name && !!item.food;
	const isConsolidated =
		item.consolidatedIds && item.consolidatedIds.length > 1;
	const servingInfo =
		item.serving && item.number_of_servings
			? getServingDescription(item.number_of_servings, item.serving)
			: null;
	const foodName = item.food?.food_name || "";
	const displayName =
		item.name || (servingInfo ? `${servingInfo} ${foodName}` : foodName);

	const [name, setName] = React.useState(displayName);
	const [notes, setNotes] = React.useState(item.notes ?? "");
	const { updateItem } = useShoppingListItems(shoppingListId);
	const { deleteShoppingListItem, isPending: isDeleting } =
		useDeleteShoppingListItemMutation(shoppingListId);

	React.useEffect(() => {
		const newServingInfo =
			item.serving && item.number_of_servings
				? getServingDescription(item.number_of_servings, item.serving)
				: null;
		const newFoodName = item.food?.food_name || "";
		const newDisplayName =
			item.name ||
			(newServingInfo ? `${newServingInfo} ${newFoodName}` : newFoodName);
		setName(newDisplayName);
		setNotes(item.notes ?? "");
	}, [item]);

	const handleSave = async () => {
		const idsToUpdate = item.consolidatedIds || [item.id];

		// Update all consolidated items with the same notes
		await Promise.all(
			idsToUpdate.map((itemId) =>
				updateItem({
					id: itemId,
					name: isIngredientItem ? undefined : name.trim() || undefined,
					notes: notes.trim() || undefined,
				}),
			),
		);
		onClose();
	};

	const handleDelete = async () => {
		const idsToDelete = item.consolidatedIds || [item.id];

		// Delete all consolidated items
		await Promise.all(
			idsToDelete.map((itemId) => deleteShoppingListItem({ id: itemId })),
		);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="w-[90vw]">
				<DialogHeader>
					<DialogTitle>Edit Item</DialogTitle>
				</DialogHeader>

				<View className="gap-4 py-4">
					{isConsolidated && (
						<View className="p-3 bg-muted rounded-md">
							<Text className="text-sm text-muted-foreground">
								This is a consolidated entry representing{" "}
								{item.consolidatedIds?.length} items. Changes will apply to all
								of them.
							</Text>
						</View>
					)}
					<Input
						placeholder="Item name..."
						value={name}
						onChangeText={setName}
						editable={!isIngredientItem}
						className={isIngredientItem ? "opacity-50" : undefined}
					/>
					<Textarea
						placeholder="Notes (optional)..."
						value={notes}
						onChangeText={setNotes}
						numberOfLines={3}
					/>
				</View>

				<DialogFooter>
					<Button
						variant="ghost"
						size="icon"
						onPress={handleDelete}
						disabled={isDeleting}
					>
						<Trash2Icon className="h-5 w-5 text-destructive" />
					</Button>
					<View className="flex-1" />
					<Button variant="outline" onPress={onClose}>
						<Text>Cancel</Text>
					</Button>
					<Button onPress={handleSave}>
						<Text>Save</Text>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
