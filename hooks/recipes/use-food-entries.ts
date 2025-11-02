import { useQuery, useQueryClient } from "@tanstack/react-query";

import { FetchFoodEntriesResponse } from "@/app/api/food-entries/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { format } from "date-fns";

export const useFoodEntries = (startDate: Date, endDate: Date) => {
	const startDateStr = format(startDate, "yyyy-MM-dd");
	const endDateStr = format(endDate, "yyyy-MM-dd");

	const { data, ...rest } = useQuery({
		queryKey: ["foodEntries", startDateStr, endDateStr],
		queryFn: async () => {
			console.log(
				`useFoodEntries: Fetching from ${startDateStr} to ${endDateStr}`,
			);
			const response = await axiosWithAuth.get<FetchFoodEntriesResponse>(
				"/api/food-entries",
				{
					params: {
						startDate: startDateStr,
						endDate: endDateStr,
					},
				},
			);

			console.log("useFoodEntries: Response", response.data);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to fetch food entries");
			}

			return response.data.foodEntries;
		},
	});

	return {
		foodEntries: data || [],
		...rest,
	};
};

export const useInvalidateFoodEntries = () => {
	const queryClient = useQueryClient();

	return () => {
		queryClient.invalidateQueries({
			queryKey: ["foodEntries"],
		});
	};
};
