import type {
	PostGenerateSlotsRequest,
	PostGenerateSlotsResponse,
} from "@/app/api/meal-plans/generate/slots/index+api";

import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useGenerateSlots = () => {
	const mutation = useMutation<
		PostGenerateSlotsResponse,
		unknown,
		PostGenerateSlotsRequest
	>({
		mutationFn: async (request: PostGenerateSlotsRequest) => {
			const response = await axiosWithAuth.post<PostGenerateSlotsResponse>(
				"/api/meal-plans/generate/slots",
				request,
			);
			return response.data;
		},
	});

	return {
		generateSlots: mutation.mutateAsync,
		...mutation,
	};
};
