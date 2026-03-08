import { GetRecipeResponse } from "@/app/api/recipes/[id]/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMemo } from "react";
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

	const returnedRecipesKey = queries
		.map((q) => q.data)
		.filter((recipe) => recipe !== undefined)
		.map((recipe) => recipe.id)
		.join(",");

	const isLoading = queries.some((q) => q.isLoading);
	const recipes = useMemo(() => {
		return queries.map((q) => q.data).filter((recipe) => recipe !== undefined);
		// only want to compute recipes when the returned recipes changes
		// queries array isn't stable so we compute the key using recipe ids
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [returnedRecipesKey]);

	return {
		recipes,
		isLoading,
	};
};
