import { supabase } from "@/config/supabase";

export const useRecipeImage = (image_id?: string | null) => {
	if (!image_id) {
		return undefined;
	}
	return supabase.storage.from("recipe-photos").getPublicUrl(image_id).data
		.publicUrl;
};
