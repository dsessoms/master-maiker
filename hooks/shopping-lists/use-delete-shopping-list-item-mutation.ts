import { DeleteShoppingListItemResponse } from "@/app/api/shopping-lists/[id]/items/[itemId]/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { queryClient } from "@/app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useDeleteShoppingListItemMutation = (listId: string) => {
	const mutation = useMutation<
		DeleteShoppingListItemResponse,
		unknown,
		{ id: string }
	>({
		mutationFn: async ({ id }) => {
			const response =
				await axiosWithAuth.delete<DeleteShoppingListItemResponse>(
					`/api/shopping-lists/${listId}/items/${id}`,
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
		deleteShoppingListItem: mutation.mutateAsync,
		...mutation,
	};
};
