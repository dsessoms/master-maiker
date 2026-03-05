import { jsonResponse } from "@/lib/server/json-response";
import { supabaseAdmin } from "@/config/supabase-admin";

export type GetPublicRecipesResponse = Awaited<ReturnType<typeof GET>>;

// Server-side only environment variable
const SOCIAL_ACCOUNT_ID = process.env.SOCIAL_ACCOUNT_ID;

export async function GET(req: Request) {
	if (!SOCIAL_ACCOUNT_ID) {
		console.error("SOCIAL_ACCOUNT_ID environment variable is not set");
		return jsonResponse({ recipes: undefined }, { status: 500 });
	}

	try {
		// Use admin client to bypass RLS for unauthenticated public access
		const recipeRows = await supabaseAdmin
			.from("recipe")
			.select(`*, macros:recipe_macros (*)`)
			.order("created_at", { ascending: false })
			.eq("user_id", SOCIAL_ACCOUNT_ID)
			.eq("visibility", "public");

		return jsonResponse({ recipes: recipeRows.data });
	} catch (error) {
		console.error("Error fetching public recipes:", error);
		return jsonResponse({ recipes: undefined }, { status: 500 });
	}
}
