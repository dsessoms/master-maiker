import { GetFoodResponse } from "../../app/api/fat-secret/food/index+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

export const useFatSecretFood = (fatSecretId: string) => {
	const { data, ...rest } = useQuery({
		queryKey: ["fat-secret-food", fatSecretId],
		queryFn: async () => {
			const response = await axiosWithAuth.get<GetFoodResponse>(
				`/api/fat-secret/food?fatSecretId=${fatSecretId}`,
			);
			return response.data.food;
		},
		enabled: !!fatSecretId,
	});

	return {
		food: data,
		...rest,
	};
};
