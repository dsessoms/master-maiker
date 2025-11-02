import { GetProfilesResponse } from "../../app/api/profiles+api";
import axiosWithAuth from "../../lib/axiosWithAuth";
import { supabase } from "@/config/supabase";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export const useProfiles = () => {
	const { data, ...rest } = useQuery({
		queryKey: ["profiles"],
		queryFn: async () => {
			const response =
				await axiosWithAuth.get<GetProfilesResponse>("/api/profiles");
			return response.data.profiles;
		},
	});

	const profilesWithAvatarUrl = useMemo(
		() =>
			data?.map((profile) => ({
				...profile,
				avatar_url: profile.avatar_id
					? supabase.storage
							.from("avatar-photos")
							.getPublicUrl(profile.avatar_id).data.publicUrl
					: undefined,
			})) || [],
		[data],
	);

	return {
		profiles: profilesWithAvatarUrl,
		...rest,
	};
};
