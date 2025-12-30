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
import { Input } from "@/components/ui/input";
import { Plus } from "@/lib/icons";
import { View } from "react-native";
import { useCreateShoppingListItemMutation } from "@/hooks/shopping-lists/use-create-shopping-list-item-mutation";

export const AddItemModal = ({
	shoppingListId,
	isOpen,
	onClose,
}: {
	shoppingListId: string;
	isOpen: boolean;
	onClose: () => void;
}) => {
	const [itemName, setItemName] = React.useState("");
	const { createShoppingListItem, isPending } =
		useCreateShoppingListItemMutation(shoppingListId);

	const handleAdd = async () => {
		if (!itemName.trim()) return;

		await createShoppingListItem({
			type: "CUSTOM",
			name: itemName.trim(),
		});

		setItemName("");
		onClose();
	};

	const handleClose = () => {
		setItemName("");
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Item</DialogTitle>
				</DialogHeader>

				<View className="gap-4 py-4">
					<Input
						placeholder="Item name..."
						value={itemName}
						onChangeText={setItemName}
						autoFocus
						onSubmitEditing={handleAdd}
						returnKeyType="done"
					/>
				</View>

				<DialogFooter>
					<Button variant="outline" onPress={handleClose}>
						Cancel
					</Button>
					<Button onPress={handleAdd} disabled={isPending || !itemName.trim()}>
						<Plus className="mr-2 h-4 w-4" />
						Add
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
