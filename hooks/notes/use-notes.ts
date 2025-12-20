import { FetchNotesResponse, GetNotesRequest } from "@/lib/schemas/note-schema";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

export const useNotes = (params?: GetNotesRequest) => {
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
