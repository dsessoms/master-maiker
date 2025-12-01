import { FetchNotesResponse } from "@/app/api/notes/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

export interface UseNotesParams {
	noteType?: "day_meal" | "food_entry";
	date?: string; // Format: YYYY-MM-DD
	mealType?: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	foodEntryId?: string;
	startDate?: string; // Format: YYYY-MM-DD
	endDate?: string; // Format: YYYY-MM-DD
}

export const useNotes = (params?: UseNotesParams) => {
	const { data, ...rest } = useQuery({
		queryKey: ["notes", params],
		queryFn: async () => {
			const response = await axiosWithAuth.get<FetchNotesResponse>(
				"/api/notes",
				{
					params,
				},
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to fetch notes");
			}

			return response.data.notes;
		},
		enabled: !!params, // Only fetch if params are provided
	});

	return {
		notes: data || [],
		...rest,
	};
};
