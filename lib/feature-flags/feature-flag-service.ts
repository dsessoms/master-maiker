import { SupabaseClient } from "@supabase/supabase-js";
import { FeatureFlag, FeatureFlagUser } from "./types";

interface CachedFlag {
	flag: FeatureFlag;
	timestamp: number;
}

interface CachedUserOverride {
	override: FeatureFlagUser | null;
	timestamp: number;
}

export class FeatureFlagService {
	private static instance: FeatureFlagService;
	private flagCache = new Map<string, CachedFlag>();
	private userOverrideCache = new Map<string, CachedUserOverride>();
	private cacheDuration = 300_000; // 5 minute cache

	private constructor(private supabase: SupabaseClient) {}

	static getInstance(supabase: SupabaseClient): FeatureFlagService {
		if (!FeatureFlagService.instance) {
			FeatureFlagService.instance = new FeatureFlagService(supabase);
		}
		return FeatureFlagService.instance;
	}

	private isCacheValid(timestamp: number): boolean {
		return Date.now() - timestamp < this.cacheDuration;
	}

	private getCacheKey(flagId: string, userId: string): string {
		return `${flagId}:${userId}`;
	}

	/**
	 * Check if a feature is enabled for a specific user
	 * Priority: User-specific override > Global flag
	 */
	async isEnabled(flagName: string, userId?: string): Promise<boolean> {
		// Get the feature flag (with caching)
		const flag = await this.getFlagCached(flagName);

		if (!flag) {
			console.warn(`Feature flag "${flagName}" not found`);
			return false;
		}

		// If no user ID provided, return global flag status
		if (!userId) {
			return flag.enabled;
		}

		// Check for user-specific override (with caching)
		const userOverride = await this.getUserOverrideCached(flag.id, userId);

		// If user has a specific override, use that
		if (userOverride) {
			return userOverride.enabled;
		}

		// Otherwise, use the global flag
		return flag.enabled;
	}

	private async getFlagCached(flagName: string): Promise<FeatureFlag | null> {
		const cached = this.flagCache.get(flagName);

		if (cached && this.isCacheValid(cached.timestamp)) {
			return cached.flag;
		}

		// Fetch from database
		const { data: flag, error: flagError } = await this.supabase
			.from("feature_flags")
			.select("*")
			.eq("name", flagName)
			.single();

		if (flagError || !flag) {
			return null;
		}

		// Cache the result
		this.flagCache.set(flagName, { flag, timestamp: Date.now() });

		return flag;
	}

	private async getUserOverrideCached(
		flagId: string,
		userId: string,
	): Promise<FeatureFlagUser | null> {
		const cacheKey = this.getCacheKey(flagId, userId);
		const cached = this.userOverrideCache.get(cacheKey);

		if (cached && this.isCacheValid(cached.timestamp)) {
			return cached.override;
		}

		// Fetch from database - use maybeSingle() to handle 0 rows gracefully
		const { data: userOverride, error: userError } = await this.supabase
			.from("feature_flag_users")
			.select("*")
			.eq("feature_flag_id", flagId)
			.eq("user_id", userId)
			.maybeSingle();

		const override = userError ? null : userOverride;

		// Cache the result (even if null)
		this.userOverrideCache.set(cacheKey, {
			override,
			timestamp: Date.now(),
		});

		return override;
	}

	/**
	 * Get all feature flags
	 */
	async getAllFlags(): Promise<FeatureFlag[]> {
		const { data, error } = await this.supabase
			.from("feature_flags")
			.select("*")
			.order("name");

		if (error) {
			throw new Error(`Failed to fetch feature flags: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get a specific feature flag by name
	 */
	async getFlag(flagName: string): Promise<FeatureFlag | null> {
		const { data, error } = await this.supabase
			.from("feature_flags")
			.select("*")
			.eq("name", flagName)
			.single();

		if (error) {
			console.warn(`Feature flag "${flagName}" not found:`, error);
			return null;
		}

		return data;
	}

	/**
	 * Get all users with overrides for a specific feature flag
	 */
	async getUsersForFlag(flagName: string): Promise<FeatureFlagUser[]> {
		const flag = await this.getFlag(flagName);
		if (!flag) {
			throw new Error(`Feature flag "${flagName}" not found`);
		}

		const { data, error } = await this.supabase
			.from("feature_flag_users")
			.select("*")
			.eq("feature_flag_id", flag.id);

		if (error) {
			throw new Error(`Failed to fetch users for flag: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get all feature flag overrides for a specific user
	 */
	async getFlagsForUser(userId: string): Promise<FeatureFlagUser[]> {
		const { data, error } = await this.supabase
			.from("feature_flag_users")
			.select("*")
			.eq("user_id", userId);

		if (error) {
			throw new Error(`Failed to fetch flags for user: ${error.message}`);
		}

		return data || [];
	}
}
