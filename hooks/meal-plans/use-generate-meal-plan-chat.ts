import type { PostChatRequest } from "@/lib/schemas/meal-plans/generate/draft-schema";
import type { PostChatResponse } from "@/app/api/meal-plans/generate/chat/index+api";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";

export const useGenerateMealPlanChat = () => {
	const mutation = useMutation<PostChatResponse, AxiosError, PostChatRequest>({
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
