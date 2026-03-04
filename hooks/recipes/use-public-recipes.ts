import { GetPublicRecipesResponse } from "@/app/api/recipes/public/index+api";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export const usePublicRecipes = () => {
	const { data, ...rest } = useQuery({
		queryKey: ["public-recipes"],
		queryFn: async () => {
			const response =
				await axios.get<GetPublicRecipesResponse>(`/api/recipes/public`);
			return response.data.recipes;
		},
	});

	return {
		recipes: data,
		...rest,
	};
};
