import * as React from "react";

import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ConsolidatedItemType } from "./types";
import { Image } from "@/components/image";
import { Input } from "@/components/ui/input";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Trash2Icon } from "@/lib/icons";
import { router } from "expo-router";
import { useDeleteShoppingListItemMutation } from "@/hooks/shopping-lists/use-delete-shopping-list-item-mutation";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";
import { useShoppingListItems } from "@/hooks/shopping-lists/use-shopping-list-items";

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
	return serving.measurement_description
		? `${totalUnits} ${serving.measurement_description}`
		: totalUnits.toString();
};

const RecipeRow = ({
	recipe,
	onPress,
}: {
	recipe: { id: string; name: string; image_id?: string | null };
	onPress: () => void;
}) => {
	const imageUrl = useRecipeImage(recipe.image_id);

	return (
		<Pressable
			onPress={onPress}
			className="flex-row items-center gap-3 p-2 rounded-md bg-muted active:bg-muted/80"
		>
			{imageUrl ? (
				<Image
					source={{ uri: imageUrl }}
					className="h-12 w-12 rounded"
					contentFit="cover"
				/>
			) : (
				<View className="h-12 w-12 rounded bg-muted-foreground/20 items-center justify-center overflow-hidden">
					<Text className="text-xs font-bold opacity-20 text-muted-foreground">
						{recipe.name.toUpperCase()}
					</Text>
				</View>
			)}
			<Text className="flex-1 text-sm font-medium">{recipe.name}</Text>
		</Pressable>
	);
};

export const UpdateItemModal = ({
	shoppingListId,
	item,
	isOpen,
	onClose,
}: {
	shoppingListId: string;
	item: ConsolidatedItemType;
	isOpen: boolean;
	onClose: () => void;
}) => {
	// For items with a food reference, display the food name with serving info but treat it as read-only
	const isIngredientItem = !item.name && !!item.food;
	const isConsolidated =
		item.consolidatedIds && item.consolidatedIds.length > 1;
	const servingInfo =
		item.serving && item.number_of_servings
			? getServingDescription(item.number_of_servings, item.serving)
			: null;
	const foodName = item.food?.food_name || "";
	const displayName =
		item.name || (servingInfo ? `${servingInfo} ${foodName}` : foodName);

	const [name, setName] = React.useState(displayName);
	const [notes, setNotes] = React.useState(item.notes ?? "");
	const { items, updateItem } = useShoppingListItems(shoppingListId);
	const { deleteShoppingListItem, isPending: isDeleting } =
		useDeleteShoppingListItemMutation(shoppingListId);

	// Get unique recipes for this item's consolidated IDs
	const recipes = React.useMemo(() => {
		if (!items) return [];

		const idsToCheck = item.consolidatedIds || [item.id];
		const recipeMap = new Map<
			string,
			{ id: string; name: string; image_id?: string | null }
		>();

		items.forEach((shoppingItem) => {
			if (
				idsToCheck.includes(shoppingItem.id) &&
				shoppingItem.recipe_id &&
				shoppingItem.recipe
			) {
				recipeMap.set(shoppingItem.recipe_id, {
					id: shoppingItem.recipe_id,
					name: shoppingItem.recipe.name,
					image_id: shoppingItem.recipe.image_id,
				});
			}
		});

		return Array.from(recipeMap.values());
	}, [items, item]);

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
		const idsToUpdate = item.consolidatedIds || [item.id];

		// Update all consolidated items with the same notes
		await Promise.all(
			idsToUpdate.map((itemId) =>
				updateItem({
					id: itemId,
					name: isIngredientItem ? undefined : name.trim() || undefined,
					notes: notes.trim() || undefined,
				}),
			),
		);
		onClose();
	};

	const handleDelete = async () => {
		const idsToDelete = item.consolidatedIds || [item.id];

		// Delete all consolidated items
		await Promise.all(
			idsToDelete.map((itemId) => deleteShoppingListItem({ id: itemId })),
		);
		onClose();
	};

	const handleRecipePress = (recipeId: string) => {
		onClose();
		router.push(
			{
				pathname: "/(tabs)/(recipes)/recipes/[id]",
				params: { id: recipeId },
			},
			{ withAnchor: true },
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="w-[90vw]">
				<DialogHeader>
					<DialogTitle>Edit Item</DialogTitle>
				</DialogHeader>

				<View className="gap-4 py-4">
					{isConsolidated && (
						<View className="p-3 bg-muted rounded-md">
							<Text className="text-sm text-muted-foreground">
								This is a consolidated entry representing{" "}
								{item.consolidatedIds?.length} items. Changes will apply to all
								of them.
							</Text>
						</View>
					)}
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
					{recipes.length > 0 && (
						<View className="gap-2">
							<Text className="text-sm font-semibold">
								{recipes.length === 1 ? "Recipe" : "Recipes"}
							</Text>
							<View className="gap-2">
								{recipes.map((recipe) => (
									<RecipeRow
										key={recipe.id}
										recipe={recipe}
										onPress={() => handleRecipePress(recipe.id)}
									/>
								))}
							</View>
						</View>
					)}
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
