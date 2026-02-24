import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { PostRecipesResponse } from "@/app/api/recipes/index+api";
import { Recipe } from "@/lib/schemas";

export const useCopyRecipeMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (recipe: Recipe) => {
			const response = await axiosWithAuth.post<PostRecipesResponse>(
				"/api/recipes",
				recipe,
			);
			return response.data;
		},
		onSuccess: () => {
			// Invalidate the recipes list to show the new copy
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});
};
