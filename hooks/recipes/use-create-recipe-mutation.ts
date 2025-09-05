import { PostRecipesResponse } from "../../app/api/recipes/index+api";
import { Recipe } from "@/lib/schemas";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { queryClient } from "../../app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useCreateRecipeMutation = () => {
	const mutation = useMutation<PostRecipesResponse, unknown, Recipe>({
		mutationFn: async (arg: Recipe) => {
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
