import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export interface PostShoppingListRequest {
	name: string;
	is_default?: boolean;
}

export type GetShoppingListsResponse = Awaited<ReturnType<typeof GET>>;
export type PostShoppingListsResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ id: undefined }, { status: 401 });
	}

	// get body
	const { name, is_default } = (await req.json()) as PostShoppingListRequest;

	// If setting as default, first unset all other defaults
	if (is_default) {
		await supabase
			.from("shopping_list")
			.update({ is_default: null })
			.eq("user_id", session.user.id)
			.not("is_default", "is", null);
	}

	const { error, data } = await supabase
		.from("shopping_list")
		.insert({
			name: name,
			user_id: session.user.id,
			is_default: is_default ? true : null,
		})
		.select("id")
		.single();

	if (error) {
		console.error(error);
		return jsonResponse({ id: undefined }, { status: 400 });
	}

	return jsonResponse({ id: data.id });
}

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ lists: undefined }, { status: 401 });
	}

	const { data, error } = await supabase
		.from("shopping_list")
		.select(`id, name, created_at, is_default`)
		.eq("user_id", session.user.id)
		.order("created_at", { ascending: false });

	if (error) {
		console.error(error);
		return jsonResponse({ lists: undefined }, { status: 400 });
	}

	return jsonResponse({ lists: data });
}
