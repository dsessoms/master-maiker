import { useMutation, useQueryClient } from "@tanstack/react-query";

import { UpdateFoodEntryResponse } from "@/app/api/food-entries/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";

export interface UpdateFoodEntryPayload {
	foodEntryId: string;
	date?: string; // Format: YYYY-MM-DD
	mealType?: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	profileServings?: {
		profile_id: string;
		servings: number;
	}[];
}

export const useUpdateFoodEntry = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: UpdateFoodEntryPayload) => {
			const response = await axiosWithAuth.patch<UpdateFoodEntryResponse>(
				"/api/food-entries",
				payload,
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to update food entry");
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
