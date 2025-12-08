import { MealPlanChatRecipe } from "@/lib/schemas";
import { PutRecipeResponse } from "../../app/api/recipes/[id]/index+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { queryClient } from "../../app/_layout";
import { useMutation } from "@tanstack/react-query";

export const useUpdateRecipeMutation = () => {
	const mutation = useMutation<
		PutRecipeResponse,
		unknown,
		{ id: string; recipe: MealPlanChatRecipe }
	>({
		mutationFn: async (arg: { id: string; recipe: MealPlanChatRecipe }) => {
			const response = await axiosWithAuth.put<PutRecipeResponse>(
				`/api/recipes/${arg.id}`,
				arg.recipe,
			);
			return response.data;
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
			queryClient.invalidateQueries({ queryKey: ["recipe", variables.id] });
		},
	});

	return {
		updateRecipe: mutation.mutateAsync,
		...mutation,
	};
};
