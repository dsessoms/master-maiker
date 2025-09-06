import { GetRecipeResponse } from "../../app/api/recipes/[id]/index+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

export const useRecipe = (id: string) => {
	const { data, ...rest } = useQuery({
		queryKey: ["recipe", id],
		queryFn: async () => {
			const response = await axiosWithAuth.get<GetRecipeResponse>(
				`/api/recipes/${id}`,
			);
			return response.data.recipe;
		},
		enabled: !!id,
	});

	return {
		recipe: data,
		...rest,
	};
};
