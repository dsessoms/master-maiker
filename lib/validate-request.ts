import { z } from "zod";

/**
 * A generic decorator for POST requests that parses and validates the JSON body.
 * Throws a 400 error if the request body is invalid.
 *
 * @param schema - The Zod schema to validate the request body against.
 * @param handler - The handler function to execute if validation passes.
 */
export function withValidatedBody<T>(
	schema: z.ZodSchema<T>,
	handler: (parsedBody: T, request: Request) => Promise<Response>,
) {
	return async (request: Request): Promise<Response> => {
		try {
			const body = await request.json();
			const parsedBody = schema.parse(body);
			return await handler(parsedBody, request);
		} catch (error) {
			console.error("Validation error:", error);
			return new Response(JSON.stringify({ error: (error as Error).message }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}
	};
}
