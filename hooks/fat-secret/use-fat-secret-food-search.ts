import { FatSecretFoodSearchV2 } from "../../lib/server/fat-secret/types";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

export const useFatSecretFoodSearch = (search?: string) => {
	const { data, ...rest } = useQuery({
		queryKey: ["fat-secret-food-search", search],
		queryFn: async () => {
			const response = await axiosWithAuth.get<FatSecretFoodSearchV2>(
				`/api/fat-secret/food/search?query=${search}`,
			);
			return response.data;
		},
		enabled: !!search,
	});

	return {
		searchResults: data,
		...rest,
	};
};
