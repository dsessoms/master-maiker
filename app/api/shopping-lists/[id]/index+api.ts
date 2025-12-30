import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export interface PatchShoppingListRequest {
	name?: string;
	is_default?: boolean;
}

export type PatchShoppingListResponse = Awaited<ReturnType<typeof PATCH>>;
export type DeleteShoppingListResponse = Awaited<ReturnType<typeof DELETE>>;

export async function PATCH(req: Request, { id }: { id: string }) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({}, { status: 401 });
	}

	// get body
	const { name, is_default } = (await req.json()) as PatchShoppingListRequest;

	if (is_default) {
		const { error } = await supabase.rpc("set_default_shopping_list", {
			shopping_list_id: id,
		});

		if (error) {
			console.error(error);
			return jsonResponse({}, { status: 400 });
		}
	}

	const { data, error } = await supabase
		.from("shopping_list")
		.update({
			name: name,
		})
		.eq("id", id)
		.eq("user_id", session.user.id)
		.select();

	if (error) {
		console.error(error);
		return jsonResponse({}, { status: 400 });
	}

	return jsonResponse({ list: data });
}

export async function DELETE(req: Request, { id }: { id: string }) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse(null, { status: 401 });
	}

	const { data } = await supabase
		.from("shopping_list")
		.select("is_default")
		.eq("user_id", session.user.id)
		.eq("id", id)
		.single();

	if (data?.is_default) {
		return jsonResponse(null, { status: 401 });
	}

	const { error, status } = await supabase
		.from("shopping_list")
		.delete()
		.eq("user_id", session.user.id)
		.eq("id", id)
		.is("is_default", null);

	if (error) {
		console.error(error);
		return jsonResponse(null, { status });
	}

	return jsonResponse(null, { status: 200 });
}
