import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export interface ChatMessage {
	role: "assistant" | "user";
	content: string;
}

export interface QuickOption {
	title: string;
}

export interface MultiSelectOptions {
	title: string;
	options: QuickOption[];
}

export interface RecipePreview {
	title: string;
	servings: number;
	ingredients: string[];
	instructions: string;
}

export interface ChatRequest {
	messages: ChatMessage[];
	stream?: boolean;
}

export interface ChatResponse {
	text: string;
	content?: string;
	quickOptions?: QuickOption[];
	multiSelectOptions?: MultiSelectOptions;
	recipePreview?: RecipePreview;
}

export const useGenerateRecipeChat = () => {
	const mutation = useMutation<ChatResponse, unknown, ChatRequest>({
		mutationFn: async (request: ChatRequest) => {
			const response = await axiosWithAuth.post<ChatResponse>(
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
