import { PostGeneratedRecipeResponse } from "../../app/api/recipes/generate/index+api";
import { RecipePromptOptions } from "@/prompts/generate-recipe-prompt";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { queryClient } from "../../app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useGenerateRecipeMutation = () => {
	const mutation = useMutation<
		PostGeneratedRecipeResponse,
		unknown,
		RecipePromptOptions
	>({
		mutationFn: async (options: RecipePromptOptions) => {
			const response = await axiosWithAuth.post<PostGeneratedRecipeResponse>(
				"/api/recipes/generate",
				options,
			);
			return response.data;
		},
		onSuccess: () => {
			// Invalidate and refetch recipes to show the new generated recipe
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});

	return {
		generateRecipe: mutation.mutateAsync,
		...mutation,
	};
};
