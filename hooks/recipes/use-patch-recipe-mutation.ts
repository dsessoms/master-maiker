import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { Database } from "@/database.types";
import { PatchRecipeResponse } from "@/app/api/recipes/[id]/index+api";

type PatchRecipeVariables = {
	recipeId: string;
	updates: Partial<Database["public"]["Tables"]["recipe"]["Update"]>;
};

export const usePatchRecipeMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ recipeId, updates }: PatchRecipeVariables) => {
			const response = await axiosWithAuth.patch<PatchRecipeResponse>(
				`/api/recipes/${recipeId}`,
				updates,
			);
			return response.data;
		},
		onSuccess: (_, variables) => {
			// Invalidate the specific recipe query to refetch with updated data
			queryClient.invalidateQueries({
				queryKey: ["recipe", variables.recipeId],
			});
			// Also invalidate the recipes list
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});
};
