import {
	CreateNoteRequest,
	CreateNoteResponse,
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
		onSuccess: () => {
			// Invalidate all notes queries to refetch the updated data
			queryClient.invalidateQueries({
				queryKey: ["notes"],
			});
		},
	});
};
