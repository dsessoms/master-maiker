import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DeleteProfilesResponse } from "../../app/api/profiles+api";
import axiosWithAuth from "../../lib/axiosWithAuth";

export const useDeleteProfile = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (profileId: string) => {
			const response = await axiosWithAuth.delete<DeleteProfilesResponse>(
				`/api/profiles?id=${profileId}`,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profiles"] });
		},
	});
};
