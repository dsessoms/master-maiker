import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "@/lib/icons";
import { TextInput, View } from "react-native";
import { useContext, useState } from "react";

import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Image } from "../image";
import { MealPlanContext } from "@/context/meal-plan-context";
import { Text } from "../ui/text";
import { useDeleteFoodEntry } from "@/hooks/recipes/use-delete-food-entry";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";
import { useUpdateFoodEntry } from "@/hooks/recipes/use-update-food-entry";

export const FoodEntry = ({ entry }: { entry: any }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editingServings, setEditingServings] = useState<
		Record<string, string>
	>({});
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const { selectableProfiles } = useContext(MealPlanContext);
	const { mutate: deleteFoodEntry, isPending: isDeleting } =
		useDeleteFoodEntry();
	const { mutate: updateFoodEntry, isPending: isUpdating } =
		useUpdateFoodEntry();

	// Get the food name from recipe or food entry
	const foodName =
		entry.recipe?.name ||
		(entry.food?.food_name
			? `${entry.food.food_name}${entry.food.brand_name ? ` (${entry.food.brand_name})` : ""}`
			: "Unknown Food");

	// Get recipe image if available
	const imageUrl = useRecipeImage(entry.recipe?.image_id);

	// Create a map of profile ID to profile for quick lookup
	const profileMap = new Map(selectableProfiles.map((p: any) => [p.id, p]));

	// Create a map of selected profile IDs
	const selectedProfileIds = new Set(
		selectableProfiles.filter((p: any) => p.isSelected).map((p: any) => p.id),
	);

	const handleDelete = () => {
		setShowDeleteConfirm(true);
	};

	const confirmDelete = () => {
		setShowDeleteConfirm(false);
		deleteFoodEntry(entry.id);
	};

	const handleEdit = () => {
		// Initialize editing servings with current values
		const servingsMap: Record<string, string> = {};
		entry.profile_food_entry.forEach((pfe: any) => {
			servingsMap[pfe.profile_id] = pfe.number_of_servings.toString();
		});
		setEditingServings(servingsMap);
		setIsEditing(true);
	};

	const handleSaveServings = () => {
		// Convert back to the format expected by the API
		const profileServings = Object.entries(editingServings).map(
			([profileId, servings]) => ({
				profile_id: profileId,
				servings: parseInt(servings, 10),
			}),
		);

		updateFoodEntry({
			foodEntryId: entry.id,
			profileServings,
		});

		setIsEditing(false);
	};

	return (
		<View className="flex-1 flex-row gap-2 mb-2 p-2 bg-background rounded-md">
			{/* Recipe Image */}
			<View className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
				{!!imageUrl ? (
					<Image
						source={{ uri: imageUrl }}
						className="w-full h-full"
						contentFit="cover"
					/>
				) : (
					<View className="w-full h-full bg-muted flex items-center justify-center">
						<Text className="text-xs font-bold text-muted-foreground opacity-20 text-center px-1">
							{foodName.toUpperCase()}
						</Text>
					</View>
				)}
			</View>
			<View className="flex-1">
				<View className="flex-row justify-between items-start">
					<Text className="text-base font-medium flex-1">{foodName}</Text>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="px-2">
								<Icon as={MoreHorizontalIcon} size={20} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onPress={handleEdit}>
								<PencilIcon className="mr-2 h-4 w-4" />
								<Text>Edit</Text>
							</DropdownMenuItem>
							<DropdownMenuItem onPress={handleDelete}>
								<Trash2Icon className="mr-2 h-4 w-4" />
								<Text>Delete</Text>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</View>
				{entry.profile_food_entry && entry.profile_food_entry.length > 0 && (
					<View className="mt-1 gap-1 flex-row flex-wrap">
						{entry.profile_food_entry
							.filter(
								(pfe: any) =>
									pfe.number_of_servings > 0 &&
									selectedProfileIds.has(pfe.profile_id),
							)
							.map((pfe: any) => {
								const profile = profileMap.get(pfe.profile_id);
								const initials = profile?.name
									? profile.name.slice(0, 1).toUpperCase()
									: "?";

								return (
									<View
										key={pfe.id}
										className="flex-row items-center gap-0.5 pl-0.5 pr-2 py-0.5 bg-gray-200 rounded-full"
									>
										<Avatar
											alt={`${profile?.name}'s Avatar`}
											className="h-5 w-5"
										>
											{profile?.avatar_url ? (
												<AvatarImage source={{ uri: profile.avatar_url }} />
											) : null}
											<AvatarFallback>
												<Text className="text-xs font-semibold">
													{initials}
												</Text>
											</AvatarFallback>
										</Avatar>
										<Text className="text-sm font-medium text-gray-700">
											{pfe.number_of_servings}
										</Text>
									</View>
								);
							})}
					</View>
				)}
			</View>

			{/* Edit Servings Dialog */}
			<Dialog open={isEditing} onOpenChange={setIsEditing}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Servings</DialogTitle>
						<DialogDescription>
							Update the number of servings for each person
						</DialogDescription>
					</DialogHeader>
					<View className="gap-4">
						{entry.profile_food_entry
							.filter((pfe: any) => selectedProfileIds.has(pfe.profile_id))
							.map((pfe: any) => {
								const profile = profileMap.get(pfe.profile_id);
								return (
									<View key={pfe.profile_id} className="gap-2">
										<Text className="text-sm font-medium">
											{profile?.name || "Unknown"}
										</Text>
										<TextInput
											value={editingServings[pfe.profile_id] || ""}
											onChangeText={(value) =>
												setEditingServings((prev) => ({
													...prev,
													[pfe.profile_id]: value,
												}))
											}
											placeholder="Enter servings"
											keyboardType="decimal-pad"
											className="border border-gray-300 rounded px-3 py-2"
										/>
									</View>
								);
							})}
						<View className="flex-row gap-2 justify-end mt-4">
							<Button
								variant="outline"
								onPress={() => setIsEditing(false)}
								disabled={isUpdating}
							>
								<Text>Cancel</Text>
							</Button>
							<Button onPress={handleSaveServings} disabled={isUpdating}>
								<Text>{isUpdating ? "Saving..." : "Save"}</Text>
							</Button>
						</View>
					</View>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Food Entry</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this food entry? This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<View className="flex-row gap-2 justify-end mt-4">
						<Button
							variant="outline"
							onPress={() => setShowDeleteConfirm(false)}
							disabled={isDeleting}
						>
							<Text>Cancel</Text>
						</Button>
						<Button
							variant="destructive"
							onPress={confirmDelete}
							disabled={isDeleting}
						>
							<Text>{isDeleting ? "Deleting..." : "Delete"}</Text>
						</Button>
					</View>
				</DialogContent>
			</Dialog>
		</View>
	);
};
