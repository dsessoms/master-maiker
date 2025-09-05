import { GetParsedIngredientResponse } from "../../app/api/recipes/parse/ingredient/index+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useParseIngredient = () => {
	const mutation = useMutation({
		mutationFn: async (
			ingredient: string,
		): Promise<GetParsedIngredientResponse> => {
			const response = await axiosWithAuth.get<GetParsedIngredientResponse>(
				`/api/recipes/parse/ingredient?ingredient=${encodeURIComponent(ingredient)}`,
			);
			return response.data;
		},
	});

	return {
		parseIngredient: mutation.mutateAsync,
		...mutation,
	};
};
