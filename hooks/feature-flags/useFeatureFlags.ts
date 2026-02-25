import { useState, useEffect } from "react";
import { supabase } from "@/config/supabase";
import { FeatureFlagService } from "@/lib/feature-flags/feature-flag-service";
import { FeatureFlag } from "@/lib/feature-flags/types";

/**
 * Hook to get all feature flags
 * @returns Object containing all feature flags, loading state, and error
 */
export function useFeatureFlags() {
	const [flags, setFlags] = useState<FeatureFlag[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		async function fetchFlags() {
			try {
				setLoading(true);
				const service = FeatureFlagService.getInstance(supabase);
				const allFlags = await service.getAllFlags();

				setFlags(allFlags);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error("Failed to fetch feature flags"),
				);
				setFlags([]);
			} finally {
				setLoading(false);
			}
		}

		fetchFlags();
	}, []);

	return { flags, loading, error };
}
