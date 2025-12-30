import {
	PostItem,
	PostShoppingListItemsResponse,
} from "@/app/api/shopping-lists/[id]/items/index+api";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { queryClient } from "@/app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useCreateShoppingListItemMutation = (listId: string) => {
	const mutation = useMutation<
		PostShoppingListItemsResponse,
		unknown,
		PostItem | PostItem[]
	>({
		mutationFn: async (arg) => {
			const response = await axiosWithAuth.post<PostShoppingListItemsResponse>(
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
		createShoppingListItem: mutation.mutateAsync,
		...mutation,
	};
};
