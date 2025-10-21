import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CreateProfileData } from "./useCreateProfile";
import { PutProfilesResponse } from "../../app/api/profiles+api";
import axiosWithAuth from "../../lib/axiosWithAuth";

export interface UpdateProfileData extends CreateProfileData {
	id: string;
}

export const useUpdateProfile = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (profileData: UpdateProfileData) => {
			const response = await axiosWithAuth.put<PutProfilesResponse>(
				"/api/profiles",
				profileData,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profiles"] });
		},
	});
};
