/**
 * Utility functions for extracting dynamic URL parameters from paths
 */

/**
 * Extracts dynamic path segments from a URL pathname
 * @param pathname - The URL pathname (e.g., "/recipes/123/edit")
 * @param template - The route template (e.g., "/recipes/[id]/edit")
 * @returns Object with extracted parameters or null if no match
 *
 * @example
 * ```typescript
 * const params = extractPathParams("/recipes/123", "/recipes/[id]");
 * // Returns: { id: "123" }
 *
 * const params = extractPathParams("/recipes/123/ingredients/456", "/recipes/[id]/ingredients/[ingredientId]");
 * // Returns: { id: "123", ingredientId: "456" }
 * ```
 */
export function extractPathParams(
	pathname: string,
	template: string,
): Record<string, string> | null {
	// Remove leading/trailing slashes and split into segments
	const pathSegments = pathname.replace(/^\/|\/$/g, "").split("/");
	const templateSegments = template.replace(/^\/|\/$/g, "").split("/");

	if (pathSegments.length !== templateSegments.length) {
		return null;
	}

	const params: Record<string, string> = {};

	for (let i = 0; i < templateSegments.length; i++) {
		const templateSegment = templateSegments[i];
		const pathSegment = pathSegments[i];

		// Check if this is a dynamic segment (wrapped in brackets)
		if (templateSegment.startsWith("[") && templateSegment.endsWith("]")) {
			const paramName = templateSegment.slice(1, -1); // Remove brackets
			params[paramName] = pathSegment;
		} else if (templateSegment !== pathSegment) {
			// Static segments must match exactly
			return null;
		}
	}

	return params;
}

/**
 * Extracts a single dynamic parameter from a URL pathname
 * @param pathname - The URL pathname
 * @param template - The route template
 * @param paramName - The name of the parameter to extract
 * @returns The parameter value or null if not found
 *
 * @example
 * ```typescript
 * const id = extractParam("/recipes/123", "/recipes/[id]", "id");
 * // Returns: "123"
 * ```
 */
export function extractParam(
	pathname: string,
	template: string,
	paramName: string,
): string | null {
	const params = extractPathParams(pathname, template);
	return params?.[paramName] ?? null;
}

/**
 * Extracts dynamic parameters from a Request object using Expo Router conventions
 * @param req - The Request object
 * @param template - The route template (e.g., "/api/recipes/[id]")
 * @returns Object with extracted parameters
 *
 * @example
 * ```typescript
 * // In an API route like /api/recipes/[id]/index+api.ts
 * const params = extractParamsFromRequest(req, "/api/recipes/[id]");
 * // Returns: { id: "123" } for URL /api/recipes/123
 * ```
 */
export function extractParamsFromRequest(
	req: Request,
	template: string,
): Record<string, string> | null {
	const url = new URL(req.url);
	return extractPathParams(url.pathname, template);
}

/**
 * Extracts the ID parameter from common patterns
 * @param pathname - The URL pathname or Request object
 * @param idSegmentIndex - The index of the ID segment (default: 1 for /entity/[id] pattern)
 * @returns The ID value or null if not found
 *
 * @example
 * ```typescript
 * const id = extractId("/recipes/123"); // Returns: "123"
 * const id = extractId("/api/recipes/456/ingredients"); // Returns: "456"
 * ```
 */
export function extractId(
	pathname: string | Request,
	idSegmentIndex: number = 1,
): string | null {
	const path =
		typeof pathname === "string" ? pathname : new URL(pathname.url).pathname;
	const segments = path.replace(/^\/|\/$/g, "").split("/");

	return segments[idSegmentIndex] || null;
}

/**
 * Type-safe parameter extraction with validation
 * @param pathname - The URL pathname
 * @param template - The route template
 * @param validator - Function to validate the extracted parameters
 * @returns Validated parameters or null if validation fails
 *
 * @example
 * ```typescript
 * const params = extractValidatedParams(
 *   "/recipes/123",
 *   "/recipes/[id]",
 *   (p) => p.id && /^\d+$/.test(p.id) ? p : null
 * );
 * ```
 */
export function extractValidatedParams<T>(
	pathname: string,
	template: string,
	validator: (params: Record<string, string>) => T | null,
): T | null {
	const params = extractPathParams(pathname, template);
	if (!params) return null;

	return validator(params);
}
