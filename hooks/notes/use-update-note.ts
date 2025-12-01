import { useMutation, useQueryClient } from "@tanstack/react-query";

import { UpdateNoteResponse } from "@/app/api/notes/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";

export interface UpdateNotePayload {
	noteId: string;
	value?: string;
	isCheckbox?: boolean;
	isChecked?: boolean;
	displayOrder?: number;
}

export const useUpdateNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: UpdateNotePayload) => {
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
