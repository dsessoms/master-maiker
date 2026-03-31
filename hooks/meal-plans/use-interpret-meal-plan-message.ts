import type { InterpreterRequest } from "@/lib/meal-plan-draft/types";
import type { InterpreterResponseFromSchema } from "@/lib/meal-plan-draft/interpreter-schema";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useMutation } from "@tanstack/react-query";

export const useInterpretMealPlanMessage = () => {
	const mutation = useMutation<
		InterpreterResponseFromSchema,
		unknown,
		InterpreterRequest
	>({
		mutationFn: async (request: InterpreterRequest) => {
			const response = await axiosWithAuth.post<InterpreterResponseFromSchema>(
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
