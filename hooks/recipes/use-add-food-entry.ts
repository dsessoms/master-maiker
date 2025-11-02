import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AddFoodEntryResponse } from "@/app/api/food-entries/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";

export interface AddFoodEntryPayload {
	date: string; // Format: YYYY-MM-DD
	mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	recipeId: string;
	profileServings: {
		profile_id: string;
		servings: number;
	}[];
}

export const useAddFoodEntry = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: AddFoodEntryPayload) => {
			const response = await axiosWithAuth.post<AddFoodEntryResponse>(
				"/api/food-entries",
				payload,
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to add food entry");
			}

			return response.data;
		},
		onSuccess: () => {
			// Invalidate the food entries query to refetch the updated data
			queryClient.invalidateQueries({
				queryKey: ["foodEntries"],
			});
		},
	});
};
