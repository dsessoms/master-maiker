import { GenerateMealPlanInputSchema } from "../../../validation/meal-plan/generate-input";
import { withValidatedBody } from "../../../lib/validate-request";

export const POST = withValidatedBody(
	GenerateMealPlanInputSchema,
	async (parsedBody) => {
		console.log(parsedBody);
		return Response.json({});
	},
);
