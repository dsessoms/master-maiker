import { DeleteRecipeResponse } from "../../app/api/recipes/[id]/index+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { queryClient } from "../../app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useDeleteRecipeMutation = () => {
	const mutation = useMutation<DeleteRecipeResponse, unknown, string>({
		mutationFn: async (recipeId: string) => {
			const response = await axiosWithAuth.delete<DeleteRecipeResponse>(
				`/api/recipes/${recipeId}`,
			);
			return response.data;
		},
		onSuccess: (data, recipeId) => {
			// Invalidate and refetch
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
			queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
		},
	});

	return {
		deleteRecipe: mutation.mutateAsync,
		...mutation,
	};
};
