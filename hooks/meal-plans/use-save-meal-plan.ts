import type { GeneratedMealPlan } from "@/lib/schemas/meal-plans/generate/chat-schema";
import type { PostSaveResponse } from "@/app/api/meal-plans/generate/save/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export interface SaveMealPlanRequest {
	generatedMealPlan: GeneratedMealPlan;
}

export const useSaveMealPlan = () => {
	const mutation = useMutation<PostSaveResponse, unknown, SaveMealPlanRequest>({
		mutationFn: async (request: SaveMealPlanRequest) => {
			const response = await axiosWithAuth.post<PostSaveResponse>(
				"/api/meal-plans/generate/save",
				request,
			);
			return response.data;
		},
	});

	return {
		saveMealPlan: mutation.mutateAsync,
		...mutation,
	};
};
