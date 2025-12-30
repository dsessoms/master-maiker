import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export interface PatchShoppingListItem {
	name?: string;
	servingId?: string;
	numberOfServings?: number;
	notes?: string;
	isChecked?: boolean;
}

export type PatchShoppingListItemResponse = Awaited<ReturnType<typeof PATCH>>;
export type DeleteShoppingListItemResponse = Awaited<ReturnType<typeof DELETE>>;

export async function PATCH(req: Request, { itemId }: { itemId: string }) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse(null, { status: 401 });
	}

	// get body
	const listItemUpdates = (await req.json()) as PatchShoppingListItem;

	const { error, status } = await supabase
		.from("shopping_list_item")
		.update({
			name: listItemUpdates.name,
			serving_id: listItemUpdates.servingId,
			number_of_servings: listItemUpdates.numberOfServings,
			notes: listItemUpdates.notes,
			is_checked: listItemUpdates.isChecked,
		})
		.eq("user_id", session.user.id)
		.eq("id", itemId);

	if (error) {
		console.error(error);
		return jsonResponse(null, { status });
	}

	return jsonResponse(null, { status: 200 });
}

export async function DELETE(req: Request, { itemId }: { itemId: string }) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse(null, { status: 401 });
	}

	const { error, status } = await supabase
		.from("shopping_list_item")
		.delete()
		.eq("user_id", session.user.id)
		.eq("id", itemId);

	if (error) {
		console.error(error);
		return jsonResponse(null, { status });
	}

	return jsonResponse(null, { status: 200 });
}
