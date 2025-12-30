import {
	GetShoppingListItemsResponse,
	PostItem,
	PostShoppingListItemsResponse,
} from "@/app/api/shopping-lists/[id]/items/index+api";
import { useMutation, useQuery } from "@tanstack/react-query";

import { PatchShoppingListItem } from "@/app/api/shopping-lists/[id]/items/[itemId]/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { queryClient } from "@/app/_layout";

export const useShoppingListItems = (listId: string) => {
	const { data, ...rest } = useQuery({
		queryKey: ["shopping-list-items", listId],
		queryFn: async () => {
			const response = await axiosWithAuth.get<GetShoppingListItemsResponse>(
				`/api/shopping-lists/${listId}/items`,
			);
			return response.data.items;
		},
		enabled: !!listId,
	});

	const updateMutation = useMutation<
		unknown,
		unknown,
		{ id: string } & PatchShoppingListItem
	>({
		mutationFn: async ({ id, ...updates }) => {
			const response = await axiosWithAuth.patch(
				`/api/shopping-lists/${listId}/items/${id}`,
				updates,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["shopping-list-items", listId],
			});
		},
	});

	return {
		items: data,
		updateItem: updateMutation.mutateAsync,
		...rest,
	};
};
