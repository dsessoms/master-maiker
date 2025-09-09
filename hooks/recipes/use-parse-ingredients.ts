import { PostParsedIngredientsResponse } from "../../app/api/recipes/parse/ingredient/index+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useParseIngredients = () => {
	const mutation = useMutation({
		mutationFn: async (
			ingredients: string[],
		): Promise<PostParsedIngredientsResponse> => {
			const response = await axiosWithAuth.post<PostParsedIngredientsResponse>(
				"/api/recipes/parse/ingredient",
				{ ingredients },
			);
			return response.data;
		},
	});

	return {
		parseIngredients: mutation.mutateAsync,
		...mutation,
	};
};
