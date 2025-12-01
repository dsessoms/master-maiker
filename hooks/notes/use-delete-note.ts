import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DeleteNoteResponse } from "@/app/api/notes/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";

export const useDeleteNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (noteId: string) => {
			const response = await axiosWithAuth.delete<DeleteNoteResponse>(
				"/api/notes",
				{
					data: {
						noteId,
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
