import {
	PatchShoppingListRequest,
	PatchShoppingListResponse,
} from "@/app/api/shopping-lists/[id]/index+api";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { queryClient } from "@/app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useUpdateShoppingListMutation = (listId: string) => {
	const mutation = useMutation<
		PatchShoppingListResponse,
		unknown,
		PatchShoppingListRequest
	>({
		mutationFn: async (arg: PatchShoppingListRequest) => {
			const response = await axiosWithAuth.patch<PatchShoppingListResponse>(
				`/api/shopping-lists/${listId}`,
				arg,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
			queryClient.invalidateQueries({
				queryKey: ["shopping-list-items", listId],
			});
		},
	});

	return {
		updateShoppingList: mutation.mutateAsync,
		...mutation,
	};
};
