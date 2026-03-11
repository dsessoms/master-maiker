import {
	CreateNoteRequest,
	CreateNoteResponse,
	FetchNotesResponse,
} from "@/lib/schemas/note-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axiosWithAuth from "@/lib/axiosWithAuth";

export const useCreateNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateNoteRequest) => {
			const response = await axiosWithAuth.post<CreateNoteResponse>(
				"/api/notes",
				payload,
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to create note");
			}

			return response.data;
		},
		onMutate: async (payload: CreateNoteRequest) => {
			// Cancel any outgoing refetches to avoid overwriting our optimistic update
			await queryClient.cancelQueries({
				queryKey: ["notes"],
			});

			// Snapshot all the previous notes queries
			const previousQueries = queryClient.getQueriesData<
				FetchNotesResponse["notes"]
			>({
				queryKey: ["notes"],
			});

			// Create optimistic note with temporary ID
			const optimisticNote = {
				id: `temp-${Date.now()}`,
				user_id: "", // Will be filled by server
				note_type: payload.noteType,
				date: payload.date || null,
				meal_type: payload.mealType || null,
				food_entry_id: payload.foodEntryId || null,
				value: payload.value,
				is_checkbox: payload.isCheckbox || false,
				is_checked: payload.isChecked || false,
				display_order: payload.displayOrder || 0,
				created_at: new Date().toISOString(),
			};

			// Optimistically add the new note to all matching queries
			queryClient.setQueriesData<FetchNotesResponse["notes"]>(
				{ queryKey: ["notes"] },
				(oldData) => {
					if (!oldData) return [optimisticNote];
					return [...oldData, optimisticNote];
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
				queryKey: ["notes"],
			});
		},
	});
};
