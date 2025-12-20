import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DeleteNoteResponse } from "@/lib/schemas/note-schema";
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
		onSuccess: () => {
			// Invalidate all notes queries to refetch the updated data
			queryClient.invalidateQueries({
				queryKey: ["notes"],
			});
		},
	});
};
