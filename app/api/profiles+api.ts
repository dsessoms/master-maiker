import { jsonResponse } from "@/lib/server/json-response";
import { supabase } from "@/config/supabase-server";
import { validateSession } from "@/lib/server/validate-session";

export const dynamic = "force-dynamic";

export type GetProfilesResponse = Awaited<ReturnType<typeof GET>>;
export type PostProfilesResponse = Awaited<ReturnType<typeof POST>>;
export type PutProfilesResponse = Awaited<ReturnType<typeof PUT>>;
export type DeleteProfilesResponse = Awaited<ReturnType<typeof DELETE>>;

export async function GET(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ profiles: undefined }, { status: 401 });
	}

	// Fetch all profiles for the authenticated user
	const { data: profiles, error } = await supabase
		.from("profile")
		.select("*")
		.eq("user_id", session.user.id)
		.order("is_primary", { ascending: false })
		.order("created_at", { ascending: true });

	if (error) {
		console.error("Error fetching profiles:", error);
		return jsonResponse({ profiles: undefined }, { status: 500 });
	}

	return jsonResponse({ profiles });
}

export async function POST(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ profile: undefined }, { status: 401 });
	}

	const profileData = await req.json();

	// Validate required fields
	if (!profileData.name) {
		return jsonResponse(
			{ profile: undefined, error: "Name is required" },
			{ status: 400 },
		);
	}

	const { data: profile, error } = await supabase
		.from("profile")
		.insert({
			...profileData,
			user_id: session.user.id,
			is_primary: false, // Only primary profiles are created through user registration
		})
		.select()
		.single();

	if (error) {
		console.error("Error creating profile:", error);
		return jsonResponse({ profile: undefined }, { status: 500 });
	}

	return jsonResponse({ profile });
}

export async function PUT(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ profile: undefined }, { status: 401 });
	}

	const { id, ...profileData } = await req.json();

	if (!id) {
		return jsonResponse(
			{ profile: undefined, error: "Profile ID is required" },
			{ status: 400 },
		);
	}

	// Remove is_primary from profileData to prevent users from changing it
	const { is_primary, ...updateData } = profileData;

	const { data: profile, error } = await supabase
		.from("profile")
		.update(updateData)
		.eq("id", id)
		.eq("user_id", session.user.id)
		.select()
		.single();

	if (error) {
		console.error("Error updating profile:", error);
		return jsonResponse({ profile: undefined }, { status: 500 });
	}

	return jsonResponse({ profile });
}

export async function DELETE(req: Request) {
	const session = await validateSession(req);

	if (!session.user) {
		return jsonResponse({ success: false }, { status: 401 });
	}

	const url = new URL(req.url);
	const id = url.searchParams.get("id");

	if (!id) {
		return jsonResponse(
			{ success: false, error: "Profile ID is required" },
			{ status: 400 },
		);
	}

	// Check if the profile is primary - cannot delete primary profiles
	const { data: profile } = await supabase
		.from("profile")
		.select("is_primary")
		.eq("id", id)
		.eq("user_id", session.user.id)
		.single();

	if (profile?.is_primary) {
		return jsonResponse(
			{ success: false, error: "Cannot delete primary profile" },
			{ status: 400 },
		);
	}

	const { error } = await supabase
		.from("profile")
		.delete()
		.eq("id", id)
		.eq("user_id", session.user.id);

	if (error) {
		console.error("Error deleting profile:", error);
		return jsonResponse({ success: false }, { status: 500 });
	}

	return jsonResponse({ success: true });
}
