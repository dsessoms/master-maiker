import type {
	MealPlanChatChatResponse,
	MealPlanChatRequest,
} from "@/lib/schemas/meal-plans/generate/chat-schema";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useGenerateMealPlanChat = () => {
	const mutation = useMutation<
		MealPlanChatChatResponse,
		unknown,
		MealPlanChatRequest
	>({
		mutationFn: async (request: MealPlanChatRequest) => {
			const response = await axiosWithAuth.post<MealPlanChatChatResponse>(
				"/api/meal-plans/generate/chat",
				request,
			);
			return response.data;
		},
	});

	return {
		sendMessage: mutation.mutateAsync,
		...mutation,
	};
};
