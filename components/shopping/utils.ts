import {
	ConsolidatedItemType,
	ItemType,
	SpecialGroupKey,
} from "@/components/shopping/types";

// Helper function to get aisle from food (returns first aisle if multiple)
export const getAisle = (item: ItemType): string => {
	// Use the aisle field from the food item if available
	if (item.food?.aisle) {
		// Split by semicolon to handle multiple aisles, use first one
		const aisles = item.food.aisle
			.split(";")
			.map((aisle) => aisle.trim())
			.filter((aisle) => aisle.length > 0);

		if (aisles.length > 0) {
			return aisles[0];
		}
	}

	// Fallback categorization based on food type
	if (item.food?.food_type === "Brand") {
		return "Packaged Foods";
	}

	// Default to "Other" if no aisle information is available
	return "Other";
};

// Group items by recipe
export const groupByRecipe = (items: ConsolidatedItemType[] | undefined) => {
	if (!items) return {};

	const grouped: Record<string, ConsolidatedItemType[]> = {};

	items.forEach((item) => {
		const key = item.recipe_id
			? item.recipe_id
			: item.food
				? SpecialGroupKey.OTHER
				: SpecialGroupKey.CUSTOM;

		if (!grouped[key]) {
			grouped[key] = [];
		}
		grouped[key].push(item);
	});

	return grouped;
};

// Consolidate items that share the same food and serving
export const consolidateItems = (
	items: ItemType[] | undefined,
	groupByRecipe: boolean = false,
): ConsolidatedItemType[] => {
	if (!items) return [];

	const consolidated = new Map<string, ConsolidatedItemType>();

	items.forEach((item) => {
		let key: string | null = null;

		// Create unique key based on food ID, serving, and notes
		// When grouping by recipe, include recipe_id in the key to prevent cross-recipe consolidation
		const recipePrefix = groupByRecipe
			? `recipe-${item.recipe_id || "none"}-`
			: "";
		const notesKey = `notes-${item.notes || ""}`;

		if (item.food?.spoonacular_id && item.serving?.measurement_description) {
			key = `${recipePrefix}spoonacular-${item.food.spoonacular_id}-${item.serving.measurement_description}-${notesKey}`;
		} else if (item.food?.fat_secret_id && item.serving?.id) {
			key = `${recipePrefix}fatsecret-${item.food.fat_secret_id}-${item.serving.id}-${notesKey}`;
		}

		// If we can create a key, check if we should consolidate
		if (key) {
			const existing = consolidated.get(key);
			if (existing) {
				// Consolidate: sum the servings and track all consolidated IDs
				const newServings =
					(existing.number_of_servings || 0) + (item.number_of_servings || 0);

				consolidated.set(key, {
					...existing,
					number_of_servings: newServings,
					consolidatedIds: [...(existing.consolidatedIds || []), item.id],
				});
				return;
			}
		}

		// If no key or no existing item, use item ID as unique key
		const itemKey = key || `item-${item.id}`;
		consolidated.set(itemKey, {
			...item,
			consolidatedIds: [item.id], // Track this item's ID
		});
	});

	return Array.from(consolidated.values());
};

// Group items by aisle
export const groupByAisle = (items: ConsolidatedItemType[] | undefined) => {
	if (!items) return {};

	const grouped: Record<string, ConsolidatedItemType[]> = {};

	items.forEach((item) => {
		const aisle = getAisle(item);

		if (!grouped[aisle]) {
			grouped[aisle] = [];
		}
		grouped[aisle].push(item);
	});

	return grouped;
};

// Sort recipe groups
export const sortRecipeGroups = (
	grouped: Record<string, ConsolidatedItemType[]>,
	items: ConsolidatedItemType[] | undefined,
): { key: string; name: string; items: ConsolidatedItemType[] }[] => {
	if (!items) return [];

	const recipeMap = new Map<string, { name: string; id?: number }>();

	// Build map of recipe info
	items.forEach((item) => {
		if (item.recipe_id && item.recipe) {
			const sortId = item.food?.spoonacular_id || item.food?.fat_secret_id || 0;
			recipeMap.set(item.recipe_id, {
				name: item.recipe.name,
				id: sortId,
			});
		}
	});

	const result: {
		key: string;
		name: string;
		items: ConsolidatedItemType[];
	}[] = [];

	// Process groups - check special keys first, then treat the rest as recipes
	Object.entries(grouped).forEach(([key, groupItems]) => {
		if (key === SpecialGroupKey.CUSTOM) {
			result.push({
				key,
				name: SpecialGroupKey.CUSTOM,
				items: groupItems,
			});
		} else if (key === SpecialGroupKey.OTHER) {
			result.push({
				key,
				name: SpecialGroupKey.OTHER,
				items: groupItems,
			});
		} else {
			// Assume it's a recipe ID
			const recipeInfo = recipeMap.get(key);
			result.push({
				key,
				name: recipeInfo?.name || "Recipe",
				items: groupItems,
			});
		}
	});

	// Sort by recipe ID (spoonacular_id or fat_secret_id)
	return result.sort((a, b) => {
		// Special keys always go to the end
		if (a.key === SpecialGroupKey.CUSTOM) return 1;
		if (b.key === SpecialGroupKey.CUSTOM) return -1;
		if (a.key === SpecialGroupKey.OTHER) return 1;
		if (b.key === SpecialGroupKey.OTHER) return -1;

		// Both are recipes, sort by their IDs
		const aInfo = recipeMap.get(a.key);
		const bInfo = recipeMap.get(b.key);

		return (aInfo?.id || 0) - (bInfo?.id || 0);
	});
};
