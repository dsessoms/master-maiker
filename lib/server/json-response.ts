// Typed response helper for type inference
export function jsonResponse<T>(data: T, init?: ResponseInit) {
	return Response.json(data, init) as unknown as T;
}
