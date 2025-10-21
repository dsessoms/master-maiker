import { supabase } from "@/config/supabase";
import { useMemo } from "react";

export const useAvatarImage = (avatar_id: string | null | undefined) => {
	return useMemo(() => {
		if (!avatar_id) return undefined;
		return supabase.storage.from("avatar-photos").getPublicUrl(avatar_id).data
			.publicUrl;
	}, [avatar_id]);
};
