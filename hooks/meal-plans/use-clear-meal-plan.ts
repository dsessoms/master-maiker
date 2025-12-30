import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DeleteClearResponse } from "@/app/api/meal-plans/clear+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { format } from "date-fns";

interface ClearMealPlanParams {
	startDate: Date;
	endDate: Date;
}

export const useClearMealPlan = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ startDate, endDate }: ClearMealPlanParams) => {
			const startDateStr = format(startDate, "yyyy-MM-dd");
			const endDateStr = format(endDate, "yyyy-MM-dd");

			const response = await axiosWithAuth.delete<DeleteClearResponse>(
				"/api/meal-plans/clear",
				{
					params: {
						startDate: startDateStr,
						endDate: endDateStr,
					},
				},
			);

			if ("error" in response.data) {
				throw new Error(response.data.error || "Failed to clear meal plan");
			}

			return response.data;
		},
		onSuccess: () => {
			// Invalidate food entries query to refetch
			queryClient.invalidateQueries({
				queryKey: ["foodEntries"],
			});

			queryClient.invalidateQueries({
				queryKey: ["notes"],
			});
		},
	});
};
