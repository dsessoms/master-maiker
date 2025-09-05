import { GetRecipesResponse } from "../../app/api/recipes/index+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

export const useRecipes = () => {
	const { data, ...rest } = useQuery({
		queryKey: ["recipes"],
		queryFn: async () => {
			const response =
				await axiosWithAuth.get<GetRecipesResponse>("/api/recipes");
			return response.data.recipes;
		},
	});

	return {
		recipes: data,
		...rest,
	};
};
