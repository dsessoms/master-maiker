import { GetRecipeResponse } from "@/app/api/recipes/[id]/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useQueries } from "@tanstack/react-query";

export const useBatchGetRecipes = (recipeIds?: string[]) => {
	const queries = useQueries({
		queries: (recipeIds || []).map((id) => ({
			queryKey: ["recipe", id],
			queryFn: async () => {
				const response = await axiosWithAuth.get<GetRecipeResponse>(
					`/api/recipes/${id}`,
				);
				return response.data.recipe;
			},
			enabled: !!id,
		})),
	});

	const isLoading = queries.some((q) => q.isLoading);
	const recipes = queries
		.map((q) => q.data)
		.filter((recipe) => recipe !== undefined);

	return {
		recipes,
		isLoading,
	};
};
