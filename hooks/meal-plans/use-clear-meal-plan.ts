import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DeleteClearResponse } from "@/app/api/meal-plans/clear+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { format } from "date-fns";

interface ClearMealPlanParams {
	startDate: Date;
	endDate: Date;
}

interface ClearMealPlanByDatesParams {
	dates: Date[];
}

type ClearParams = ClearMealPlanParams | ClearMealPlanByDatesParams;

export const useClearMealPlan = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: ClearParams) => {
			const queryParams =
				"dates" in params
					? {
							dates: params.dates.map((d) => format(d, "yyyy-MM-dd")).join(","),
						}
					: {
							startDate: format(params.startDate, "yyyy-MM-dd"),
							endDate: format(params.endDate, "yyyy-MM-dd"),
						};

			const response = await axiosWithAuth.delete<DeleteClearResponse>(
				"/api/meal-plans/clear",
				{
					params: queryParams,
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
