import { GetShoppingListItemsResponse } from "@/app/api/shopping-lists/[id]/items/index+api";

export type ItemType = NonNullable<GetShoppingListItemsResponse["items"]>[0];

// Extended type to track consolidated items
export type ConsolidatedItemType = ItemType & {
	consolidatedIds?: string[]; // Array of original item IDs that were consolidated
};
