import {
	FetchNotesResponse,
	UpdateNoteRequest,
	UpdateNoteResponse,
} from "@/lib/schemas/note-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axiosWithAuth from "@/lib/axiosWithAuth";

export const useUpdateNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: UpdateNoteRequest) => {
			const response = await axiosWithAuth.patch<UpdateNoteResponse>(
				"/api/notes",
				payload,
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to update note");
			}

			return response.data;
		},
		onMutate: async (payload: UpdateNoteRequest) => {
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

			// Optimistically update all notes queries that match ["notes", ...]
			queryClient.setQueriesData<FetchNotesResponse["notes"]>(
				{ queryKey: ["notes"] },
				(oldData) => {
					if (!oldData) return oldData;

					return oldData.map((note) => {
						if (note.id === payload.id) {
							return {
								...note,
								...(payload.value !== undefined && { value: payload.value }),
								...(payload.isCheckbox !== undefined && {
									is_checkbox: payload.isCheckbox,
								}),
								...(payload.isChecked !== undefined && {
									is_checked: payload.isChecked,
								}),
								...(payload.displayOrder !== undefined && {
									display_order: payload.displayOrder,
								}),
							};
						}
						return note;
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
				queryKey: ["notes"],
			});
		},
	});
};
