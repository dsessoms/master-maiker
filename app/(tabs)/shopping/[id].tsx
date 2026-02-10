import * as React from "react";

import {
	ConsolidatedItemType,
	SpecialGroupKey,
} from "../../../components/shopping/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Star, Trash2Icon, X } from "@/lib/icons";
import { ScrollView, View } from "react-native";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	consolidateItems,
	groupByAisle,
	groupByRecipe,
	sortRecipeGroups,
} from "@/components/shopping/utils";
import { router, useLocalSearchParams } from "expo-router";

import { AddItemModal } from "../../../components/shopping/add-item-modal";
import { Button } from "@/components/ui/button";
import { ClearShoppingListDialog } from "../../../components/shopping/clear-shopping-list-dialog";
import { CreateShoppingListModal } from "../../../components/shopping/create-shopping-list-modal";
import { DeleteShoppingListDialog } from "../../../components/shopping/delete-shopping-list-dialog";
import { GroupedItemsList } from "@/components/shopping/grouped-item-list";
import { ListItem } from "@/components/shopping/list-item";
import { MustrdButton } from "@/components/mustrd-button";
import { SafeAreaView } from "@/components/safe-area-view";
import { ShoppingListSelector } from "@/components/shopping/shopping-list-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { UpdateItemModal } from "../../../components/shopping/update-item-modal";
import { useClearShoppingListMutation } from "@/hooks/shopping-lists/use-clear-shopping-list-mutation";
import { useDeleteShoppingListMutation } from "@/hooks/shopping-lists/use-delete-shopping-list-mutation";
import { useShoppingListItems } from "@/hooks/shopping-lists/use-shopping-list-items";
import { useShoppingLists } from "@/hooks/shopping-lists/use-shopping-lists";
import { useToggle } from "@/hooks/useToggle";
import { useUpdateShoppingListMutation } from "@/hooks/shopping-lists/use-update-shopping-list-mutation";

enum GroupingMode {
	RECIPE = "recipe",
	AISLE = "aisle",
}

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
	const [groupingMode, setGroupingMode] = React.useState<GroupingMode>(
		GroupingMode.AISLE,
	);

	const selectedList = lists?.find((list) => list.id === id);
	const uncheckedItems = items?.filter((item) => !item.is_checked);
	const checkedItems = items?.filter((item) => item.is_checked);
	const hasCheckedItems = checkedItems && checkedItems.length > 0;

	// Consolidate items before grouping
	const consolidatedUnchecked = React.useMemo(
		() =>
			consolidateItems(uncheckedItems, groupingMode === GroupingMode.RECIPE),
		[uncheckedItems, groupingMode],
	);
	const consolidatedChecked = React.useMemo(
		() => consolidateItems(checkedItems, groupingMode === GroupingMode.RECIPE),
		[checkedItems, groupingMode],
	);

	// Group items based on selected mode
	const groupedUnchecked = React.useMemo(() => {
		if (groupingMode === GroupingMode.RECIPE) {
			const grouped = groupByRecipe(consolidatedUnchecked);
			return sortRecipeGroups(grouped, consolidatedUnchecked);
		} else {
			const grouped = groupByAisle(consolidatedUnchecked);
			return Object.entries(grouped)
				.map(([name, items]) => ({ key: name, name, items }))
				.sort((a, b) => {
					if (a.name === SpecialGroupKey.OTHER) return 1;
					if (b.name === SpecialGroupKey.OTHER) return -1;
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
				onValueChange={(value) => setGroupingMode(value as GroupingMode)}
				className="flex-1"
			>
				<View className="flex-row items-center justify-between p-4 w-full max-w-3xl mx-auto">
					<ShoppingListSelector
						currentListId={id!}
						lists={lists}
						onCreateNew={toggleCreateListModal}
					/>

					<TabsList>
						<TabsTrigger value={GroupingMode.AISLE}>
							<Text>By Aisle</Text>
						</TabsTrigger>
						<TabsTrigger value={GroupingMode.RECIPE}>
							<Text>By Recipe</Text>
						</TabsTrigger>
					</TabsList>
				</View>

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
