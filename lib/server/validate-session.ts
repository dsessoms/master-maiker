import { supabase } from "@/config/supabase-server";

export async function validateSession(req: Request) {
	const accessToken = req.headers.get("authorization")?.split(" ")[1];
	const refreshToken = req.headers.get("refresh");
	const {
		data: { user },
	} = await supabase.auth.getUser(accessToken || undefined);
	if (!user || !accessToken || !refreshToken) {
		return {
			user: undefined,
		};
	}

	await supabase.auth.setSession({
		access_token: accessToken,
		refresh_token: refreshToken,
	});

	return { user };
}
