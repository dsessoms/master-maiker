import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export async function GET(req: Request) {
	try {
		const session = await validateSession(req);

		if (!session.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get tags for the current user
		const { data, error } = await supabase
			.from("tags")
			.select("id, name")
			.eq("user_id", session.user.id)
			.order("name");

		if (error) {
			console.error("Error fetching tags:", error);
			return Response.json({ error: error.message }, { status: 500 });
		}

		return Response.json(data);
	} catch (error) {
		console.error("Unexpected error fetching tags:", error);
		return Response.json({ error: "Failed to fetch tags" }, { status: 500 });
	}
}

export async function DELETE(req: Request) {
	try {
		const session = await validateSession(req);

		if (!session.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const tagId = searchParams.get("id");

		if (!tagId) {
			return Response.json({ error: "Tag ID is required" }, { status: 400 });
		}

		// Delete the tag (CASCADE will handle recipe_tags automatically)
		const { error } = await supabase
			.from("tags")
			.delete()
			.eq("id", parseInt(tagId))
			.eq("user_id", session.user.id); // Ensure user owns the tag

		if (error) {
			console.error("Error deleting tag:", error);
			return Response.json({ error: error.message }, { status: 500 });
		}

		return Response.json({ success: true });
	} catch (error) {
		console.error("Unexpected error deleting tag:", error);
		return Response.json({ error: "Failed to delete tag" }, { status: 500 });
	}
}
