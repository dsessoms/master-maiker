import type { MealPlanChatChatResponse } from "@/lib/schemas/meal-plans/generate/chat-schema";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export interface ChatMessage {
	role: "assistant" | "user";
	content: string;
}

export interface ChatRequest {
	messages: ChatMessage[];
}

export const useGenerateMealPlanChat = () => {
	const mutation = useMutation<MealPlanChatChatResponse, unknown, ChatRequest>({
		mutationFn: async (request: ChatRequest) => {
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
