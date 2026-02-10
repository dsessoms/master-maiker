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

interface ClearShoppingListDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	isPending?: boolean;
}

export function ClearShoppingListDialog({
	isOpen,
	onClose,
	onConfirm,
	isPending = false,
}: ClearShoppingListDialogProps) {
	const handleConfirm = async () => {
		try {
			await onConfirm();
			onClose();
		} catch (error) {
			console.error("Failed to clear shopping list:", error);
			// Error is already logged, dialog will stay open
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Clear Shopping List</DialogTitle>
					<DialogDescription>
						Are you sure you want to clear all items from this shopping list?
						This action cannot be undone.
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
						<Text>{isPending ? "Clearing..." : "Clear All"}</Text>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
