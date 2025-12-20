import {
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
		onSuccess: () => {
			// Invalidate all notes queries to refetch the updated data
			queryClient.invalidateQueries({
				queryKey: ["notes"],
			});
		},
	});
};
