import {
	PostRecipesRequest,
	PostRecipesResponse,
} from "../../app/api/recipes/index+api";

import axiosWithAuth from "../../lib/axiosWithAuth";
import { queryClient } from "../../app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useCreateRecipeMutation = () => {
	const mutation = useMutation<
		PostRecipesResponse,
		unknown,
		PostRecipesRequest
	>({
		mutationFn: async (arg: PostRecipesRequest) => {
			const response = await axiosWithAuth.post<PostRecipesResponse>(
				"/api/recipes",
				arg,
			);
			return response.data;
		},
		onSuccess: () => {
			// Invalidate and refetch
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});

	return {
		createRecipe: mutation.mutateAsync,
		...mutation,
	};
};
