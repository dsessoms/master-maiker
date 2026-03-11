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
		onMutate: async (payload: UpdateFoodEntryPayload) => {
			// Cancel any outgoing refetches to avoid overwriting our optimistic update
			await queryClient.cancelQueries({
				queryKey: ["foodEntries"],
			});

			// Snapshot all the previous food entries queries
			const previousQueries = queryClient.getQueriesData({
				queryKey: ["foodEntries"],
			});

			// Optimistically update all food entries queries
			queryClient.setQueriesData<any[]>(
				{ queryKey: ["foodEntries"] },
				(oldData) => {
					if (!oldData) return oldData;

					return oldData.map((entry) => {
						if (entry.id === payload.foodEntryId) {
							const updatedEntry = { ...entry };

							// Update date if provided
							if (payload.date) {
								updatedEntry.date = payload.date;
							}

							// Update meal_type if provided
							if (payload.mealType) {
								updatedEntry.meal_type = payload.mealType;
							}

							// Update profile servings if provided
							if (payload.profileServings) {
								updatedEntry.profile_food_entry =
									updatedEntry.profile_food_entry?.map((profileEntry: any) => {
										const update = payload.profileServings?.find(
											(ps) => ps.profile_id === profileEntry.profile_id,
										);
										if (update) {
											return {
												...profileEntry,
												number_of_servings: update.servings,
											};
										}
										return profileEntry;
									});
							}

							return updatedEntry;
						}
						return entry;
					});
				},
			);

			// Return context with the snapshotted value
			return { previousQueries };
		},
		onError: (_err, _payload, context) => {
			// Rollback to the previous value if mutation fails
			if (context?.previousQueries) {
				context.previousQueries.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
		},
		onSettled: () => {
			// Always refetch after error or success to ensure we have the correct state
			queryClient.invalidateQueries({
				queryKey: ["foodEntries"],
			});
		},
	});
};
