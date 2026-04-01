import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export type GetCatalogRecipesResponse = Awaited<ReturnType<typeof GET>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ recipes: undefined }, { status: 401 });
	}

	const url = new URL(req.url);
	const search = url.searchParams.get("search")?.trim() ?? "";
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
	const pageSize = 20;
	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	let query = supabase
		.from("recipe")
		.select(
			`id, name, description, image_id, prep_time_hours, prep_time_minutes, cook_time_hours, cook_time_minutes`,
			{ count: "exact" },
		)
		.eq("source", "catalog")
		.order("name", { ascending: true })
		.range(from, to);

	if (search) {
		query = query.ilike("name", `%${search}%`);
	}

	const { data, error, count } = await query;

	if (error) {
		return jsonResponse({ recipes: undefined, total: 0 }, { status: 500 });
	}

	return jsonResponse({ recipes: data, total: count ?? 0 });
}
