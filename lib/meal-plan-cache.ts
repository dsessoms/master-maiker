import AsyncStorage from "@react-native-async-storage/async-storage";
import { GeneratedMealPlan } from "@/hooks/meal-plans/use-generate-meal-plan-chat";

interface CachedMealPlan {
	mealPlan: GeneratedMealPlan;
	timestamp: number;
	cacheKey: string;
}

const CACHE_KEY_PREFIX = "meal_plan_cache_";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Simple hash function to generate a consistent cache key
 * Works in both React Native and web environments
 */
const simpleHash = (str: string): string => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(36);
};

/**
 * Generate a cache key based on meal plan parameters
 * This ensures the same parameters produce the same cache key
 */
export const generateMealPlanCacheKey = (
	startDate: Date | string,
	endDate: Date | string,
	profileIds: string[],
	recipeIds: string[],
	additionalContext: string,
): string => {
	const dateStart =
		startDate instanceof Date ? startDate.toISOString() : startDate;
	const dateEnd = endDate instanceof Date ? endDate.toISOString() : endDate;

	// Sort IDs to ensure consistent key generation regardless of order
	const sortedProfileIds = [...profileIds].sort();
	const sortedRecipeIds = [...recipeIds].sort();

	const key = `${dateStart}|${dateEnd}|${sortedProfileIds.join(",")}|${sortedRecipeIds.join(",")}|${additionalContext}`;

	// Create a simple hash-like string for brevity
	return CACHE_KEY_PREFIX + simpleHash(key);
};

/**
 * Store a generated meal plan in local storage
 */
export const cacheMealPlan = async (
	cacheKey: string,
	mealPlan: GeneratedMealPlan,
): Promise<void> => {
	try {
		const cached: CachedMealPlan = {
			mealPlan,
			timestamp: Date.now(),
			cacheKey,
		};
		await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
	} catch (error) {
		console.error("Error caching meal plan:", error);
		// Non-critical error, don't throw
	}
};

/**
 * Retrieve a cached meal plan from local storage
 * Returns null if not found or if expired
 */
export const getCachedMealPlan = async (
	cacheKey: string,
): Promise<GeneratedMealPlan | null> => {
	try {
		const cached = await AsyncStorage.getItem(cacheKey);
		if (!cached) {
			return null;
		}

		const parsedCache: CachedMealPlan = JSON.parse(cached);

		// Check if cache has expired
		const age = Date.now() - parsedCache.timestamp;
		if (age > CACHE_EXPIRY_MS) {
			// Clear expired cache
			await AsyncStorage.removeItem(cacheKey);
			return null;
		}

		return parsedCache.mealPlan;
	} catch (error) {
		console.error("Error retrieving cached meal plan:", error);
		return null;
	}
};

/**
 * Clear a specific cached meal plan
 */
export const clearMealPlanCache = async (cacheKey: string): Promise<void> => {
	try {
		await AsyncStorage.removeItem(cacheKey);
	} catch (error) {
		console.error("Error clearing meal plan cache:", error);
	}
};

/**
 * Clear all cached meal plans
 */
export const clearAllMealPlanCaches = async (): Promise<void> => {
	try {
		const allKeys = await AsyncStorage.getAllKeys();
		const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
		await AsyncStorage.multiRemove(cacheKeys);
	} catch (error) {
		console.error("Error clearing all meal plan caches:", error);
	}
};
