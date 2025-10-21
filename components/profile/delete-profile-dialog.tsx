import { ActivityIndicator, View } from "react-native";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface DeleteProfileDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	onCancel: () => void;
	isDeleting?: boolean;
	profileName?: string;
}

export const DeleteProfileDialog = ({
	open,
	onOpenChange,
	onConfirm,
	onCancel,
	isDeleting = false,
	profileName,
}: DeleteProfileDialogProps) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Profile</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete{" "}
						{profileName ? `"${profileName}"` : "this profile"}? This action
						cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onPress={onCancel}>
						<Text>Cancel</Text>
					</Button>
					<Button onPress={onConfirm} disabled={isDeleting}>
						<View className="flex flex-row gap-2">
							{!!isDeleting && <ActivityIndicator size="small" color="white" />}
							<Text>Delete</Text>
						</View>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
