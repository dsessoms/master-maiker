import { searchFoodV3 } from "@/lib/server/fat-secret/fat-secret-helper";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return new Response(JSON.stringify({ result: undefined }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const url = new URL(req.url);
	const query = url.searchParams.get("query");

	if (!query) {
		return new Response(
			JSON.stringify({ error: "Query parameter is required" }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		const result = await searchFoodV3(query);

		if (result.error) {
			console.error("FatSecret API error:", result.error.message);
			return new Response(JSON.stringify({ error: "Search failed" }), {
				status: 429,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Unexpected error:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
