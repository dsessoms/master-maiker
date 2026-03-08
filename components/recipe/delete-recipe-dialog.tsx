import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

interface DeleteRecipeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	onCancel: () => void;
	isDeleting?: boolean;
}

export const DeleteRecipeDialog = ({
	open,
	onOpenChange,
	onConfirm,
	onCancel,
	isDeleting = false,
}: DeleteRecipeDialogProps) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Recipe</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this recipe? This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onPress={onCancel}>
						<Text>Cancel</Text>
					</Button>
					<Button onPress={onConfirm} disabled={isDeleting}>
						<View className="flex flex-row gap-2">
							{!!isDeleting && <LoadingIndicator />}
							<Text>Delete</Text>
						</View>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
