import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CreateNoteResponse } from "@/app/api/notes/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";

export interface CreateNotePayload {
	noteType: "day_meal" | "food_entry";
	value: string;
	isCheckbox?: boolean;
	isChecked?: boolean;
	displayOrder?: number;
	// For day_meal notes
	date?: string; // Format: YYYY-MM-DD
	mealType?: "Breakfast" | "Lunch" | "Dinner" | "Snack";
	// For food_entry notes
	foodEntryId?: string;
}

export const useCreateNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateNotePayload) => {
			const response = await axiosWithAuth.post<CreateNoteResponse>(
				"/api/notes",
				payload,
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to create note");
			}

			return response.data;
		},
		onSuccess: () => {
			// Invalidate all notes queries to refetch the updated data
			queryClient.invalidateQueries({
				queryKey: ["notes"],
			});
		},
	});
};
