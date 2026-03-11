import {
	PatchShoppingListItem,
	PatchShoppingListItemResponse,
} from "@/app/api/shopping-lists/[id]/items/[itemId]/index+api";
import { useMutation, useQuery } from "@tanstack/react-query";

import { GetShoppingListItemsResponse } from "@/app/api/shopping-lists/[id]/items/index+api";
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
		Awaited<PatchShoppingListItemResponse>,
		Error,
		{ id: string } & PatchShoppingListItem,
		{ previousItems: NonNullable<typeof data> | undefined }
	>({
		mutationFn: async ({ id, ...updates }) => {
			const response = await axiosWithAuth.patch<
				Awaited<PatchShoppingListItemResponse>
			>(`/api/shopping-lists/${listId}/items/${id}`, updates);
			return response.data;
		},
		onMutate: async ({ id, ...updates }) => {
			// Cancel any outgoing refetches to avoid overwriting optimistic update
			await queryClient.cancelQueries({
				queryKey: ["shopping-list-items", listId],
			});

			// Snapshot the previous value
			const previousItems = queryClient.getQueryData<NonNullable<typeof data>>([
				"shopping-list-items",
				listId,
			]);

			if (previousItems) {
				queryClient.setQueryData<NonNullable<typeof data>>(
					["shopping-list-items", listId],
					previousItems.map((item) =>
						item.id === id
							? {
									...item,
									...updates,
									is_checked: updates.isChecked ?? item.is_checked,
								}
							: item,
					),
				);
			}

			// Return a context object with the snapshotted value
			return { previousItems };
		},
		onError: (_err, _variables, context) => {
			// If the mutation fails, roll back to the previous value
			if (context?.previousItems) {
				queryClient.setQueryData(
					["shopping-list-items", listId],
					context.previousItems,
				);
			}
		},
		onSettled: () => {
			// Always refetch after error or success to ensure we're in sync
			queryClient.invalidateQueries({
				queryKey: ["shopping-list-items", listId],
			});
		},
	});

	return {
		items: data,
		updateItem: updateMutation.mutateAsync,
		isUpdating: updateMutation.isPending,
		...rest,
	};
};
