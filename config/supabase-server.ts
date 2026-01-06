import { Database } from "../database.types";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: false,
		detectSessionInUrl: false,
	},
});
