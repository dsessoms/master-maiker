import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export async function GET(req: Request) {
	try {
		const session = await validateSession(req);

		if (!session.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { data, error } = await supabase
			.from("dish_types")
			.select("*")
			.order("name");

		if (error) {
			console.error("Error fetching dish types:", error);
			return Response.json({ error: error.message }, { status: 500 });
		}

		return Response.json(data);
	} catch (error) {
		console.error("Unexpected error fetching dish types:", error);
		return Response.json(
			{ error: "Failed to fetch dish types" },
			{ status: 500 },
		);
	}
}
