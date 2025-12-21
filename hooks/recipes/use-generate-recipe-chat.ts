import {
	RecipeChatRequest,
	RecipeChatResponse,
} from "@/lib/schemas/recipes/generate/chat-schema";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useGenerateRecipeChat = () => {
	const mutation = useMutation<RecipeChatResponse, unknown, RecipeChatRequest>({
		mutationFn: async (request: RecipeChatRequest) => {
			const response = await axiosWithAuth.post<RecipeChatResponse>(
				"/api/recipes/generate/chat",
				{ ...request, stream: false },
			);
			return response.data;
		},
	});

	return {
		sendMessage: mutation.mutateAsync,
		...mutation,
	};
};
