import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PostProfilesResponse } from "../../app/api/profiles+api";
import axiosWithAuth from "../../lib/axiosWithAuth";

export interface CreateProfileData {
	name: string;
	birthday?: string;
	gender?: "male" | "female" | "other";
	weight_lb?: number;
	height_in?: number;
	activity_level?:
		| "sedentary"
		| "lightly_active"
		| "moderately_active"
		| "very_active"
		| "extremely_active";
	calorie_target_type?: "gain" | "maintain" | "lose";
	daily_calorie_goal?: number;
	goal_lbs_per_week?: number;
	protein_grams?: number | null;
	carbs_grams?: number | null;
	fat_grams?: number | null;
	liked_food?: string[];
	disliked_food?: string[];
	avatar_id?: string;
}

export const useCreateProfile = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (profileData: CreateProfileData) => {
			const response = await axiosWithAuth.post<PostProfilesResponse>(
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
