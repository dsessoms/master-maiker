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
	return `${totalUnits} ${serving.measurement_description || "unit"}`;
};

export const UpdateItemModal = ({
	shoppingListId,
	item,
	isOpen,
	onClose,
}: {
	shoppingListId: string;
	item: ItemType;
	isOpen: boolean;
	onClose: () => void;
}) => {
	// For items with a food reference, display the food name with serving info but treat it as read-only
	const isIngredientItem = !item.name && !!item.food;
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
		// For ingredient items, we don't update the name (since it comes from the food object)
		await updateItem({
			id: item.id,
			name: isIngredientItem ? undefined : name.trim() || undefined,
			notes: notes.trim() || undefined,
		});
		onClose();
	};

	const handleDelete = async () => {
		await deleteShoppingListItem({ id: item.id });
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="w-[90vw]">
				<DialogHeader>
					<DialogTitle>Edit Item</DialogTitle>
				</DialogHeader>

				<View className="gap-4 py-4">
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
