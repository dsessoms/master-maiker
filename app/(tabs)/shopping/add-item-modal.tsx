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
import { KeyboardHint } from "@/components/ui/keyboard-hint";
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
			<DialogContent className="w-[90vw]">
				<DialogHeader>
					<DialogTitle>Add Item</DialogTitle>
				</DialogHeader>

				<View className="py-4">
					<Input
						placeholder="Item name..."
						value={itemName}
						onChangeText={setItemName}
						autoFocus
						onSubmitEditing={handleAdd}
						returnKeyType="done"
					/>
					<KeyboardHint
						keyLabel="enter"
						actionText="to save"
						show={!!itemName}
					/>
				</View>
			</DialogContent>
		</Dialog>
	);
};
