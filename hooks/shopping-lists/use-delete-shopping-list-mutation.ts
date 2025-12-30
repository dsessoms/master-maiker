import { DeleteShoppingListResponse } from "@/app/api/shopping-lists/[id]/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { queryClient } from "@/app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useDeleteShoppingListMutation = (listId: string) => {
	const mutation = useMutation<DeleteShoppingListResponse, unknown, void>({
		mutationFn: async () => {
			const response = await axiosWithAuth.delete<DeleteShoppingListResponse>(
				`/api/shopping-lists/${listId}`,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
		},
	});

	return {
		deleteShoppingList: mutation.mutateAsync,
		...mutation,
	};
};
