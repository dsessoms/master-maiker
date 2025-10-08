import { PostParsedRecipeResponse } from "../../app/api/recipes/parse/index+api";
import { SpoonacularAnalyzeRecipe } from "@/lib/schemas/spoonacular-analyze-recipe-schema";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { queryClient } from "../../app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useParseRecipeMutation = () => {
	const mutation = useMutation<
		PostParsedRecipeResponse,
		unknown,
		SpoonacularAnalyzeRecipe
	>({
		mutationFn: async (recipeData: SpoonacularAnalyzeRecipe) => {
			const response = await axiosWithAuth.post<PostParsedRecipeResponse>(
				"/api/recipes/parse",
				recipeData,
			);
			return response.data;
		},
		onSuccess: () => {
			// Invalidate and refetch recipes to show the new parsed recipe
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});

	return {
		parseRecipe: mutation.mutateAsync,
		...mutation,
	};
};
