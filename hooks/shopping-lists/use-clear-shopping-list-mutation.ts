import {
	PatchShoppingListItemsRequest,
	PatchShoppingListItemsResponse,
} from "@/app/api/shopping-lists/[id]/items/index+api";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { queryClient } from "@/app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useClearShoppingListMutation = (listId: string) => {
	const mutation = useMutation<
		PatchShoppingListItemsResponse,
		unknown,
		PatchShoppingListItemsRequest
	>({
		mutationFn: async (arg: PatchShoppingListItemsRequest) => {
			const response =
				await axiosWithAuth.patch<PatchShoppingListItemsResponse>(
					`/api/shopping-lists/${listId}/items`,
					arg,
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
		clearShoppingList: mutation.mutateAsync,
		...mutation,
	};
};
