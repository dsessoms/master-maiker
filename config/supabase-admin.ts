import { Database } from "../database.types";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseServiceRoleKey) {
	throw new Error(
		"SUPABASE_SERVICE_ROLE_KEY environment variable is not set. This is required for admin operations.",
	);
}

// Admin client that bypasses Row Level Security (RLS)
// Only use this for trusted server-side operations
export const supabaseAdmin = createClient<Database>(
	supabaseUrl,
	supabaseServiceRoleKey,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);
