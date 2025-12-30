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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { useCreateShoppingListMutation } from "@/hooks/shopping-lists/use-create-shopping-list-mutation";

export const CreateShoppingListModal = ({
	isOpen,
	onClose,
	onCreated,
}: {
	isOpen: boolean;
	onClose: () => void;
	onCreated?: (id: string) => void;
}) => {
	const [name, setName] = React.useState("");
	const [isDefault, setIsDefault] = React.useState(false);
	const { createShoppingList, isPending } = useCreateShoppingListMutation();

	const handleCreate = async () => {
		if (!name.trim()) return;

		const result = await createShoppingList({
			name: name.trim(),
			is_default: isDefault,
		});

		if (result.id) {
			onCreated?.(result.id);
		}

		setName("");
		setIsDefault(false);
		onClose();
	};

	const handleClose = () => {
		setName("");
		setIsDefault(false);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New List</DialogTitle>
				</DialogHeader>

				<View className="gap-4 py-4">
					<View className="gap-2">
						<Label>List Name</Label>
						<Input
							placeholder="e.g., Weekly Groceries"
							value={name}
							onChangeText={setName}
							autoFocus
							onSubmitEditing={handleCreate}
							returnKeyType="done"
						/>
					</View>

					<View className="flex-row items-center gap-2">
						<Checkbox
							checked={isDefault}
							onCheckedChange={(checked) => setIsDefault(checked === true)}
						/>
						<Text>Set as default list</Text>
					</View>
				</View>

				<DialogFooter>
					<Button variant="outline" onPress={handleClose}>
						Cancel
					</Button>
					<Button onPress={handleCreate} disabled={isPending || !name.trim()}>
						<Plus className="mr-2 h-4 w-4" />
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
