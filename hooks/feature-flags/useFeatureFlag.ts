import { useState, useEffect } from "react";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
import { FeatureFlagService } from "@/lib/feature-flags/feature-flag-service";

/**
 * Hook to check if a feature flag is enabled for the current user
 * @param flagName - The name of the feature flag
 * @returns Object containing enabled status and loading state
 */
export function useFeatureFlag(flagName: string) {
	const { session } = useAuth();
	const [enabled, setEnabled] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		async function checkFlag() {
			try {
				setLoading(true);
				const service = FeatureFlagService.getInstance(supabase);
				const isEnabled = await service.isEnabled(flagName, session?.user?.id);

				setEnabled(isEnabled);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error("Failed to check feature flag"),
				);
				setEnabled(false);
			} finally {
				setLoading(false);
			}
		}

		checkFlag();
	}, [flagName, session?.user?.id]);

	return { enabled, loading, error };
}
