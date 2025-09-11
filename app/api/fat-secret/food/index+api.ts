import { getFoodItem } from "@/lib/server/fat-secret/fat-secret-helper";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";

export type GetFoodResponse = Awaited<ReturnType<typeof GET>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ food: undefined }, { status: 401 });
	}

	const url = new URL(req.url);
	const fatSecretId = url.searchParams.get("fatSecretId");

	if (!fatSecretId) {
		return jsonResponse(
			{ error: "fatSecretId parameter is required" },
			{ status: 400 },
		);
	}

	try {
		const result = await getFoodItem(fatSecretId);

		if (result.error) {
			console.error("FatSecret API error:", result.error.message);
			return jsonResponse(
				{ error: "Failed to fetch food item" },
				{ status: 429 },
			);
		}

		return jsonResponse({ food: result.food });
	} catch (error) {
		console.error("Unexpected error:", error);
		return jsonResponse({ error: "Internal server error" }, { status: 500 });
	}
}
