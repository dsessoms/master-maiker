import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DeleteFoodEntryResponse } from "@/app/api/food-entries/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";

export const useDeleteFoodEntry = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (foodEntryId: string) => {
			const response = await axiosWithAuth.delete<DeleteFoodEntryResponse>(
				"/api/food-entries",
				{
					data: {
						foodEntryId,
					},
				},
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to delete food entry");
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
