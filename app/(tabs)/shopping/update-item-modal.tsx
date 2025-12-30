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
import { Textarea } from "@/components/ui/textarea";
import { Trash2Icon } from "@/lib/icons";
import { View } from "react-native";
import { useDeleteShoppingListItemMutation } from "@/hooks/shopping-lists/use-delete-shopping-list-item-mutation";
import { useShoppingListItems } from "@/hooks/shopping-lists/use-shopping-list-items";

type ItemType = NonNullable<GetShoppingListItemsResponse["items"]>[0];

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
	const [name, setName] = React.useState(item.name ?? "");
	const [notes, setNotes] = React.useState(item.notes ?? "");
	const { updateItem } = useShoppingListItems(shoppingListId);
	const { deleteShoppingListItem, isPending: isDeleting } =
		useDeleteShoppingListItemMutation(shoppingListId);

	React.useEffect(() => {
		setName(item.name ?? "");
		setNotes(item.notes ?? "");
	}, [item]);

	const handleSave = async () => {
		await updateItem({
			id: item.id,
			name: name.trim() || undefined,
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
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Item</DialogTitle>
				</DialogHeader>

				<View className="gap-4 py-4">
					<Input
						placeholder="Item name..."
						value={name}
						onChangeText={setName}
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
						Cancel
					</Button>
					<Button onPress={handleSave}>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
