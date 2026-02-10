import { GetShoppingListItemsResponse } from "@/app/api/shopping-lists/[id]/items/index+api";

export type ItemType = NonNullable<GetShoppingListItemsResponse["items"]>[0];

// Special grouping keys for non-recipe items
export enum SpecialGroupKey {
	CUSTOM = "Custom",
	OTHER = "Other",
}

// Extended type to track consolidated items
export type ConsolidatedItemType = ItemType & {
	consolidatedIds?: string[]; // Array of original item IDs that were consolidated
};
