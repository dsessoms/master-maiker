import * as React from "react";

import { ChevronDown, Plus, Star, Trash2Icon, X } from "@/lib/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pressable, ScrollView, View } from "react-native";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { router, useLocalSearchParams } from "expo-router";

import { AddItemModal } from "./add-item-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClearShoppingListDialog } from "./clear-shopping-list-dialog";
import { ConsolidatedItemType } from "./types";
import { CreateShoppingListModal } from "./create-shopping-list-modal";
import { DeleteShoppingListDialog } from "./delete-shopping-list-dialog";
import { GetShoppingListItemsResponse } from "@/app/api/shopping-lists/[id]/items/index+api";
import { Image } from "@/components/image";
import { MustrdButton } from "@/components/mustrd-button";
import { SafeAreaView } from "@/components/safe-area-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { UpdateItemModal } from "./update-item-modal";
import { cn } from "@/lib/utils";
import { getServingDescription } from "@/lib/utils/serving-description";
import { useClearShoppingListMutation } from "@/hooks/shopping-lists/use-clear-shopping-list-mutation";
import { useDeleteShoppingListMutation } from "@/hooks/shopping-lists/use-delete-shopping-list-mutation";
import { useShoppingListItems } from "@/hooks/shopping-lists/use-shopping-list-items";
import { useShoppingLists } from "@/hooks/shopping-lists/use-shopping-lists";
import { useToggle } from "@/hooks/useToggle";
import { useUpdateShoppingListMutation } from "@/hooks/shopping-lists/use-update-shopping-list-mutation";

type ItemType = NonNullable<GetShoppingListItemsResponse["items"]>[0];

// Special grouping keys for non-recipe items
enum SpecialGroupKey {
	CUSTOM = "Custom",
	OTHER = "Other",
}

const ListItem = ({
	listId,
	item,
	onClick,
}: {
	listId: string;
	item: ConsolidatedItemType;
	onClick: () => void;
}) => {
	const { updateItem } = useShoppingListItems(listId);

	// Build display text
	const displayName = item.name || item.food?.food_name || "Unknown item";
	const servingInfo =
		item.serving && item.number_of_servings
			? getServingDescription(item.number_of_servings, item.serving)
			: null;

	// Handle checkbox for consolidated items - update all consolidated IDs
	const handleCheckChange = async () => {
		const newCheckedState = !item.is_checked;
		const idsToUpdate = item.consolidatedIds || [item.id];

		// Update all consolidated items
		await Promise.all(
			idsToUpdate.map((id) =>
				updateItem({
					id,
					isChecked: newCheckedState,
				}),
			),
		);
	};

	return (
		<Pressable
			onPress={onClick}
			className="flex-row items-center gap-3 rounded-md bg-card p-3"
		>
			{item.food?.image_url && (
				<Image
					source={{ uri: item.food.image_url }}
					className={cn("h-7 w-7 rounded-md", item.is_checked && "opacity-30")}
					contentFit="contain"
				/>
			)}
			<View className="flex-1">
				<View className="flex-row flex-wrap gap-1">
					{servingInfo && (
						<Text
							className={
								item.is_checked
									? "font-semibold text-muted-foreground line-through"
									: "font-semibold"
							}
						>
							{servingInfo}
						</Text>
					)}
					<Text
						className={
							item.is_checked ? "text-muted-foreground line-through" : undefined
						}
					>
						{displayName}
					</Text>
				</View>
				{item.notes && (
					<Text className="text-sm text-muted-foreground">{item.notes}</Text>
				)}
			</View>
			<Checkbox
				checked={item.is_checked ?? false}
				onCheckedChange={handleCheckChange}
			/>
		</Pressable>
	);
};

// Helper function to get aisle from food (returns first aisle if multiple)
const getAisle = (item: ItemType): string => {
	// Use the aisle field from the food item if available
	if (item.food?.aisle) {
		// Split by semicolon to handle multiple aisles, use first one
		const aisles = item.food.aisle
			.split(";")
			.map((aisle) => aisle.trim())
			.filter((aisle) => aisle.length > 0);

		if (aisles.length > 0) {
			return aisles[0];
		}
	}

	// Fallback categorization based on food type
	if (item.food?.food_type === "Brand") {
		return "Packaged Foods";
	}

	// Default to "Other" if no aisle information is available
	return "Other";
};

// Group items by recipe
const groupByRecipe = (items: ConsolidatedItemType[] | undefined) => {
	if (!items) return {};

	const grouped: Record<string, ConsolidatedItemType[]> = {};

	items.forEach((item) => {
		const key = item.recipe_id
			? item.recipe_id
			: item.food
				? SpecialGroupKey.OTHER
				: SpecialGroupKey.CUSTOM;

		if (!grouped[key]) {
			grouped[key] = [];
		}
		grouped[key].push(item);
	});

	return grouped;
};

// Consolidate items that share the same food and serving
const consolidateItems = (
	items: ItemType[] | undefined,
	groupByRecipe: boolean = false,
): ConsolidatedItemType[] => {
	if (!items) return [];

	const consolidated = new Map<string, ConsolidatedItemType>();

	items.forEach((item) => {
		let key: string | null = null;

		// Create unique key based on food ID, serving, and notes
		// When grouping by recipe, include recipe_id in the key to prevent cross-recipe consolidation
		const recipePrefix = groupByRecipe
			? `recipe-${item.recipe_id || "none"}-`
			: "";
		const notesKey = `notes-${item.notes || ""}`;

		if (item.food?.spoonacular_id && item.serving?.measurement_description) {
			key = `${recipePrefix}spoonacular-${item.food.spoonacular_id}-${item.serving.measurement_description}-${notesKey}`;
		} else if (item.food?.fat_secret_id && item.serving?.id) {
			key = `${recipePrefix}fatsecret-${item.food.fat_secret_id}-${item.serving.id}-${notesKey}`;
		}

		// If we can create a key, check if we should consolidate
		if (key) {
			const existing = consolidated.get(key);
			if (existing) {
				// Consolidate: sum the servings and track all consolidated IDs
				const newServings =
					(existing.number_of_servings || 0) + (item.number_of_servings || 0);

				consolidated.set(key, {
					...existing,
					number_of_servings: newServings,
					consolidatedIds: [...(existing.consolidatedIds || []), item.id],
				});
				return;
			}
		}

		// If no key or no existing item, use item ID as unique key
		const itemKey = key || `item-${item.id}`;
		consolidated.set(itemKey, {
			...item,
			consolidatedIds: [item.id], // Track this item's ID
		});
	});

	return Array.from(consolidated.values());
};

// Group items by aisle
const groupByAisle = (items: ConsolidatedItemType[] | undefined) => {
	if (!items) return {};

	const grouped: Record<string, ConsolidatedItemType[]> = {};

	items.forEach((item) => {
		const aisle = getAisle(item);

		if (!grouped[aisle]) {
			grouped[aisle] = [];
		}
		grouped[aisle].push(item);
	});

	return grouped;
};

// Sort recipe groups
const sortRecipeGroups = (
	grouped: Record<string, ConsolidatedItemType[]>,
	items: ConsolidatedItemType[] | undefined,
): Array<{ key: string; name: string; items: ConsolidatedItemType[] }> => {
	if (!items) return [];

	const recipeMap = new Map<string, { name: string; id?: number }>();

	// Build map of recipe info
	items.forEach((item) => {
		if (item.recipe_id && item.recipe) {
			const sortId = item.food?.spoonacular_id || item.food?.fat_secret_id || 0;
			recipeMap.set(item.recipe_id, {
				name: item.recipe.name,
				id: sortId,
			});
		}
	});

	const result: Array<{
		key: string;
		name: string;
		items: ConsolidatedItemType[];
	}> = [];

	// Process groups - check special keys first, then treat the rest as recipes
	Object.entries(grouped).forEach(([key, groupItems]) => {
		if (key === SpecialGroupKey.CUSTOM) {
			result.push({
				key,
				name: SpecialGroupKey.CUSTOM,
				items: groupItems,
			});
		} else if (key === SpecialGroupKey.OTHER) {
			result.push({
				key,
				name: SpecialGroupKey.OTHER,
				items: groupItems,
			});
		} else {
			// Assume it's a recipe ID
			const recipeInfo = recipeMap.get(key);
			result.push({
				key,
				name: recipeInfo?.name || "Recipe",
				items: groupItems,
			});
		}
	});

	// Sort by recipe ID (spoonacular_id or fat_secret_id)
	return result.sort((a, b) => {
		// Special keys always go to the end
		if (a.key === SpecialGroupKey.CUSTOM) return 1;
		if (b.key === SpecialGroupKey.CUSTOM) return -1;
		if (a.key === SpecialGroupKey.OTHER) return 1;
		if (b.key === SpecialGroupKey.OTHER) return -1;

		// Both are recipes, sort by their IDs
		const aInfo = recipeMap.get(a.key);
		const bInfo = recipeMap.get(b.key);

		return (aInfo?.id || 0) - (bInfo?.id || 0);
	});
};

const GroupedItemsList = ({
	groups,
	listId,
	onItemClick,
}: {
	groups: Array<{
		key: string;
		name: string;
		items: ConsolidatedItemType[];
	}>;
	listId: string;
	onItemClick: (item: ConsolidatedItemType) => void;
}) => {
	return (
		<View className="gap-4">
			{groups.map((group) => (
				<View key={group.key} className="gap-2">
					<Text className="text-lg font-semibold px-1">{group.name}</Text>
					<View className="gap-2">
						{group.items.map((item) => (
							<ListItem
								key={item.id}
								item={item}
								listId={listId}
								onClick={() => onItemClick(item)}
							/>
						))}
					</View>
				</View>
			))}
		</View>
	);
};

const ShoppingListSelector = ({
	currentListId,
	lists,
	onCreateNew,
}: {
	currentListId: string;
	lists:
		| Array<{ id: string; name: string; is_default: boolean | null }>
		| undefined;
	onCreateNew: () => void;
}) => {
	const currentList = lists?.find((list) => list.id === currentListId);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="secondary" className="flex-row items-center gap-2">
					<Text className="text-lg font-bold">
						{currentList?.name || "Shopping List"}
					</Text>
					<ChevronDown className="h-5 w-5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{lists?.map((list) => (
					<DropdownMenuItem
						key={list.id}
						onPress={() => {
							if (list.id !== currentListId) {
								router.push(`/(tabs)/shopping/${list.id}` as any);
							}
						}}
					>
						<View className="flex-row items-center gap-2">
							<Text className={list.id === currentListId ? "font-bold" : ""}>
								{list.name}
							</Text>
							{list.is_default && (
								<Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
							)}
						</View>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem onPress={onCreateNew}>
					<Plus className="mr-2 h-4 w-4" />
					<Text>Create New List</Text>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default function ShoppingListDetail() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { lists } = useShoppingLists();
	const { items, isLoading } = useShoppingListItems(id!);
	const { clearShoppingList, isPending: isClearingList } =
		useClearShoppingListMutation(id!);
	const { updateShoppingList } = useUpdateShoppingListMutation(id!);
	const { deleteShoppingList, isPending: isDeletingList } =
		useDeleteShoppingListMutation(id!);
	const [isAddModalOpen, toggleAddModal] = useToggle();
	const [isCreateListModalOpen, toggleCreateListModal] = useToggle();
	const [showClearDialog, setShowClearDialog] = React.useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
	const [itemToUpdate, setItemToUpdate] =
		React.useState<ConsolidatedItemType>();
	const [groupingMode, setGroupingMode] = React.useState<"recipe" | "aisle">(
		"recipe",
	);

	const selectedList = lists?.find((list) => list.id === id);
	const uncheckedItems = items?.filter((item) => !item.is_checked);
	const checkedItems = items?.filter((item) => item.is_checked);
	const hasCheckedItems = checkedItems && checkedItems.length > 0;

	// Consolidate items before grouping
	const consolidatedUnchecked = React.useMemo(
		() => consolidateItems(uncheckedItems, groupingMode === "recipe"),
		[uncheckedItems, groupingMode],
	);
	const consolidatedChecked = React.useMemo(
		() => consolidateItems(checkedItems, groupingMode === "recipe"),
		[checkedItems, groupingMode],
	);

	// Group items based on selected mode
	const groupedUnchecked = React.useMemo(() => {
		if (groupingMode === "recipe") {
			const grouped = groupByRecipe(consolidatedUnchecked);
			return sortRecipeGroups(grouped, consolidatedUnchecked);
		} else {
			const grouped = groupByAisle(consolidatedUnchecked);
			return Object.entries(grouped)
				.map(([name, items]) => ({ key: name, name, items }))
				.sort((a, b) => {
					if (a.name === "Other") return 1;
					if (b.name === "Other") return -1;
					return a.name.localeCompare(b.name);
				});
		}
	}, [consolidatedUnchecked, groupingMode]);

	const deleteAndNavigate = async () => {
		const defaultList = lists?.find(
			(list) => list.is_default && list.id !== id,
		);
		if (!defaultList) {
			return;
		}
		await deleteShoppingList();
		router.replace(`/(tabs)/shopping/${defaultList.id}` as any);
	};

	const handleClearList = async () => {
		await clearShoppingList({ action: "clear", itemsToClear: "all" });
	};

	if (isLoading) {
		return (
			<SafeAreaView className="flex flex-1 bg-background">
				<View className="p-4 w-full max-w-3xl mx-auto">
					<Skeleton className="h-10 w-48 mb-2" />
				</View>
				<View className="flex-1 p-4 w-full max-w-3xl mx-auto bg-muted-background gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</View>
			</SafeAreaView>
		);
	}

	const handleListCreated = (newListId: string) => {
		router.push(`/(tabs)/shopping/${newListId}` as any);
	};

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<Tabs
				value={groupingMode}
				onValueChange={(value) => setGroupingMode(value as "recipe" | "aisle")}
				className="flex-1"
			>
				<View className="flex-row items-center justify-between p-4 w-full max-w-3xl mx-auto">
					<ShoppingListSelector
						currentListId={id!}
						lists={lists}
						onCreateNew={toggleCreateListModal}
					/>

					<TabsList>
						<TabsTrigger value="recipe">
							<Text>By Recipe</Text>
						</TabsTrigger>
						<TabsTrigger value="aisle">
							<Text>By Aisle</Text>
						</TabsTrigger>
					</TabsList>
				</View>

				<TabsContent value="recipe" className="flex-1">
					<ScrollView
						className="flex-1 bg-background"
						contentContainerStyle={{ flexGrow: 1 }}
					>
						<View className="p-4 flex-1 w-full max-w-3xl mx-auto bg-muted-background">
							<GroupedItemsList
								groups={groupedUnchecked}
								listId={id!}
								onItemClick={setItemToUpdate}
							/>

							{hasCheckedItems && (
								<>
									<View className="flex-row items-center justify-between py-4">
										<Text className="text-lg font-semibold">Checked Items</Text>
										<Button
											variant="outline"
											size="sm"
											onPress={() =>
												clearShoppingList({
													action: "clear",
													itemsToClear: "checked",
												})
											}
										>
											<Text>Clear</Text>
										</Button>
									</View>
									<View className="gap-2">
										{consolidatedChecked.map((item) => (
											<ListItem
												key={item.id}
												item={item}
												listId={id!}
												onClick={() => setItemToUpdate(item)}
											/>
										))}
									</View>
								</>
							)}
						</View>
					</ScrollView>
				</TabsContent>

				<TabsContent value="aisle" className="flex-1">
					<ScrollView
						className="flex-1 bg-background"
						contentContainerStyle={{ flexGrow: 1 }}
					>
						<View className="p-4 flex-1 w-full max-w-3xl mx-auto bg-muted-background">
							<GroupedItemsList
								groups={groupedUnchecked}
								listId={id!}
								onItemClick={setItemToUpdate}
							/>

							{hasCheckedItems && (
								<>
									<View className="flex-row items-center justify-between py-4">
										<Text className="text-lg font-semibold">Checked Items</Text>
										<Button
											variant="outline"
											size="sm"
											onPress={() =>
												clearShoppingList({
													action: "clear",
													itemsToClear: "checked",
												})
											}
										>
											<Text>Clear</Text>
										</Button>
									</View>
									<View className="gap-2">
										{consolidatedChecked.map((item) => (
											<ListItem
												key={item.id}
												item={item}
												listId={id!}
												onClick={() => setItemToUpdate(item)}
											/>
										))}
									</View>
								</>
							)}
						</View>
					</ScrollView>
				</TabsContent>
			</Tabs>

			<View className="flex flex-col justify-center items-center gap-2 absolute bottom-6 right-6">
				<Button
					onPress={toggleAddModal}
					variant="outline"
					size="icon"
					className="h-10 w-10 rounded-full shadow-sm"
				>
					<Plus />
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<MustrdButton />
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="end" className="w-64 mb-2">
						<DropdownMenuItem onPress={toggleAddModal}>
							<Plus className="text-foreground mr-2" size={16} />
							<Text>Add item</Text>
						</DropdownMenuItem>
						<DropdownMenuItem onPress={() => setShowClearDialog(true)}>
							<X className="text-foreground mr-2" size={16} />
							<Text>Clear all</Text>
						</DropdownMenuItem>
						{selectedList && !selectedList.is_default && (
							<DropdownMenuItem
								onPress={() => updateShoppingList({ is_default: true })}
							>
								<Star className="text-foreground mr-2" size={16} />
								<Text>Set as default</Text>
							</DropdownMenuItem>
						)}
						{selectedList && !selectedList.is_default && (
							<DropdownMenuItem onPress={() => setShowDeleteDialog(true)}>
								<Trash2Icon className="text-destructive mr-2" size={16} />
								<Text className="text-destructive">Delete list</Text>
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</View>

			<AddItemModal
				shoppingListId={id!}
				isOpen={isAddModalOpen}
				onClose={toggleAddModal}
			/>
			{itemToUpdate && (
				<UpdateItemModal
					shoppingListId={id!}
					item={itemToUpdate}
					isOpen={!!itemToUpdate}
					onClose={() => setItemToUpdate(undefined)}
				/>
			)}
			<CreateShoppingListModal
				isOpen={isCreateListModalOpen}
				onClose={toggleCreateListModal}
				onCreated={handleListCreated}
			/>
			<ClearShoppingListDialog
				isOpen={showClearDialog}
				onClose={() => setShowClearDialog(false)}
				onConfirm={handleClearList}
				isPending={isClearingList}
			/>
			<DeleteShoppingListDialog
				isOpen={showDeleteDialog}
				onClose={() => setShowDeleteDialog(false)}
				onConfirm={deleteAndNavigate}
				listName={selectedList?.name}
				isPending={isDeletingList}
			/>
		</SafeAreaView>
	);
}
