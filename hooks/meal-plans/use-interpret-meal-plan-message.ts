import type { InterpreterFinalResponse } from "@/lib/meal-plan-draft/interpreter-schema";
import type { InterpreterRequest } from "@/lib/meal-plan-draft/types";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useInterpretMealPlanMessage = () => {
	const mutation = useMutation<
		InterpreterFinalResponse,
		unknown,
		Pick<InterpreterRequest, "user_message" | "draft"> & {
			profiles?: { id: string; name: string }[];
		}
	>({
		mutationFn: async (request) => {
			const response = await axiosWithAuth.post<InterpreterFinalResponse>(
				"/api/meal-plans/generate/interpret",
				request,
			);
			return response.data;
		},
	});

	return {
		interpret: mutation.mutateAsync,
		...mutation,
	};
};
