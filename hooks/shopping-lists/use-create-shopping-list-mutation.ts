import {
	PostShoppingListRequest,
	PostShoppingListsResponse,
} from "@/app/api/shopping-lists/index+api";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { queryClient } from "@/app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useCreateShoppingListMutation = () => {
	const mutation = useMutation<
		PostShoppingListsResponse,
		unknown,
		PostShoppingListRequest
	>({
		mutationFn: async (arg: PostShoppingListRequest) => {
			const response = await axiosWithAuth.post<PostShoppingListsResponse>(
				"/api/shopping-lists",
				arg,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
		},
	});

	return {
		createShoppingList: mutation.mutateAsync,
		...mutation,
	};
};
