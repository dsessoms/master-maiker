import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface DeleteShoppingListDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	listName?: string;
	isPending?: boolean;
}

export function DeleteShoppingListDialog({
	isOpen,
	onClose,
	onConfirm,
	listName,
	isPending = false,
}: DeleteShoppingListDialogProps) {
	const handleConfirm = async () => {
		try {
			await onConfirm();
			onClose();
		} catch (error) {
			console.error("Failed to delete shopping list:", error);
			// Error is already logged, dialog will stay open
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Shopping List</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete{" "}
						{listName ? `"${listName}"` : "this shopping list"}? All items in
						this list will be permanently removed. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">
							<Text>Cancel</Text>
						</Button>
					</DialogClose>
					<Button
						variant="destructive"
						onPress={handleConfirm}
						disabled={isPending}
					>
						<Text>{isPending ? "Deleting..." : "Delete"}</Text>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
