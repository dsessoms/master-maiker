import {
	DeleteNoteResponse,
	FetchNotesResponse,
} from "@/lib/schemas/note-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axiosWithAuth from "@/lib/axiosWithAuth";

export const useDeleteNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await axiosWithAuth.delete<DeleteNoteResponse>(
				"/api/notes",
				{
					data: {
						id,
					},
				},
			);

			if (!response.data.success) {
				throw new Error(response.data.error || "Failed to delete note");
			}

			return response.data;
		},
		onMutate: async (id: string) => {
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

			// Optimistically remove the note from all matching queries
			queryClient.setQueriesData<FetchNotesResponse["notes"]>(
				{ queryKey: ["notes"] },
				(oldData) => {
					if (!oldData) return oldData;
					return oldData.filter((note) => note.id !== id);
				},
			);

			// Return context with the snapshotted value
			return { previousQueries };
		},
		onError: (_err, _id, context) => {
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
