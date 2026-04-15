import type {
	PostChatRequest,
	PostChatResponse,
} from "@/app/api/meal-plans/generate/chat/index+api";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useGenerateMealPlanChat = () => {
	const mutation = useMutation<PostChatResponse, unknown, PostChatRequest>({
		mutationFn: async (request: PostChatRequest) => {
			const response = await axiosWithAuth.post<PostChatResponse>(
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
