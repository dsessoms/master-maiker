"use client";

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
import { router, useLocalSearchParams } from "expo-router";

import { AddItemModal } from "./add-item-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClearShoppingListDialog } from "./clear-shopping-list-dialog";
import { CreateShoppingListModal } from "./create-shopping-list-modal";
import { DeleteShoppingListDialog } from "./delete-shopping-list-dialog";
import { GetShoppingListItemsResponse } from "@/app/api/shopping-lists/[id]/items/index+api";
import { Image } from "@/components/image";
import { MustrdButton } from "@/components/mustrd-button";
import { SafeAreaView } from "@/components/safe-area-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { UpdateItemModal } from "./update-item-modal";
import { useClearShoppingListMutation } from "@/hooks/shopping-lists/use-clear-shopping-list-mutation";
import { useDeleteShoppingListMutation } from "@/hooks/shopping-lists/use-delete-shopping-list-mutation";
import { useShoppingListItems } from "@/hooks/shopping-lists/use-shopping-list-items";
import { useShoppingLists } from "@/hooks/shopping-lists/use-shopping-lists";
import { useToggle } from "@/hooks/useToggle";
import { useUpdateShoppingListMutation } from "@/hooks/shopping-lists/use-update-shopping-list-mutation";

type ItemType = NonNullable<GetShoppingListItemsResponse["items"]>[0];

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
	return `${totalUnits} ${serving.measurement_description || "unit"}`;
};

const ListItem = ({
	listId,
	item,
	onClick,
}: {
	listId: string;
	item: ItemType;
	onClick: () => void;
}) => {
	const { updateItem } = useShoppingListItems(listId);

	// Build display text
	const displayName = item.name || item.food?.food_name || "Unknown item";
	const servingInfo =
		item.serving && item.number_of_servings
			? getServingDescription(item.number_of_servings, item.serving)
			: null;

	return (
		<Pressable
			onPress={onClick}
			className="flex-row items-center gap-2 rounded-md bg-card p-3"
		>
			<Checkbox
				checked={item.is_checked ?? false}
				onCheckedChange={() =>
					updateItem({
						id: item.id,
						isChecked: !item.is_checked,
					})
				}
			/>
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
		</Pressable>
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
	const [itemToUpdate, setItemToUpdate] = React.useState<ItemType>();

	const selectedList = lists?.find((list) => list.id === id);
	const uncheckedItems = items?.filter((item) => !item.is_checked);
	const checkedItems = items?.filter((item) => item.is_checked);
	const hasCheckedItems = checkedItems && checkedItems.length > 0;

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
				<View className="p-4">
					<Skeleton className="h-10 w-48 mb-2" />
				</View>
				<View className="flex-1 p-4 bg-muted-background gap-2">
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
			<View className="flex-row items-center justify-between p-4">
				<ShoppingListSelector
					currentListId={id!}
					lists={lists}
					onCreateNew={toggleCreateListModal}
				/>
			</View>

			<ScrollView className="flex-1 p-4 bg-muted-background">
				<View className="gap-2">
					{uncheckedItems?.map((item) => (
						<ListItem
							key={item.id}
							item={item}
							listId={id!}
							onClick={() => setItemToUpdate(item)}
						/>
					))}
				</View>

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
							{checkedItems?.map((item) => (
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
			</ScrollView>

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
