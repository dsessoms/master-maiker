"use client";

import * as React from "react";

import { ActivityIndicator, ScrollView, View } from "react-native";
import {
	AddShoppingItemsData,
	FoodServingMap,
	IngredientMap,
	RecipeMap,
} from "./types";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { FoodCheckbox } from "./food-checkbox";
import { Plus } from "@/lib/icons";
import { RecipeCheckList } from "./recipe-checklist";
import { Text } from "@/components/ui/text";
import { useBatchGetRecipes } from "@/hooks/recipes/use-batch-get-recipes";
import { useCreateShoppingListItemMutation } from "@/hooks/shopping-lists/use-create-shopping-list-item-mutation";
import { useShoppingLists } from "@/hooks/shopping-lists/use-shopping-lists";

interface State {
	recipeMap: RecipeMap;
	foodMap: FoodServingMap;
}

function reducer(
	state: State,
	action:
		| { type: "loadRecipes"; recipeMap: RecipeMap }
		| { type: "loadFoods"; foodMap: FoodServingMap }
		| {
				type: "updateIngredient";
				recipeId: string;
				ingredientId: string;
				include: boolean;
		  }
		| {
				type: "updateRecipeServing";
				recipeId: string;
				numberOfServings: number;
		  }
		| {
				type: "updateFood";
				servingId: string;
				include: boolean;
		  },
): State {
	const newState = structuredClone(state);

	switch (action.type) {
		case "loadRecipes":
			newState.recipeMap = action.recipeMap;
			return newState;
		case "loadFoods":
			newState.foodMap = action.foodMap;
			return newState;
		case "updateIngredient":
			newState.recipeMap[action.recipeId].ingredientMap[action.ingredientId] =
				action.include;
			return newState;
		case "updateRecipeServing":
			newState.recipeMap[action.recipeId].numberOfServings =
				action.numberOfServings;
			return newState;
		case "updateFood":
			newState.foodMap[action.servingId].include = action.include;
			return newState;
	}
}

const ModalContent = ({
	itemsToAdd,
	shoppingListId,
	onClose,
}: {
	itemsToAdd: AddShoppingItemsData;
	shoppingListId: string;
	onClose: () => void;
}) => {
	const { createShoppingListItem, isPending: isAddingShoppingListItems } =
		useCreateShoppingListItemMutation(shoppingListId);

	// Use a ref to track the stringified recipe IDs to avoid infinite loops
	const recipeIdsStringRef = React.useRef<string>("");
	const recipeIdsString = JSON.stringify(
		itemsToAdd.recipes?.map(({ recipeId }) => recipeId) ?? [],
	);

	// Only update the ref if the stringified value actually changed
	if (recipeIdsStringRef.current !== recipeIdsString) {
		recipeIdsStringRef.current = recipeIdsString;
	}

	const recipeIds = React.useMemo(
		() => JSON.parse(recipeIdsStringRef.current) as string[],
		[recipeIdsStringRef.current],
	);

	const { recipes, isLoading: isLoadingRecipes } =
		useBatchGetRecipes(recipeIds);
	const [state, dispatch] = React.useReducer(reducer, {
		recipeMap: {},
		foodMap: {},
	});

	React.useEffect(() => {
		if (!recipes?.length) return;

		const recipeMap: RecipeMap = {};

		recipes.forEach((recipe) => {
			if (!recipe) return;
			const ingredientMap: IngredientMap = {};
			recipe.ingredient?.forEach((ing) => (ingredientMap[ing.id] = true));
			const numberOfServings =
				itemsToAdd.recipes?.find(({ recipeId }) => recipeId === recipe.id)
					?.numberOfServings ??
				recipe.number_of_servings ??
				1;
			recipeMap[recipe.id] = {
				recipe: {
					...recipe,
					ingredients: recipe.ingredient,
				},
				numberOfServings,
				ingredientMap: ingredientMap,
			};
		});

		dispatch({ type: "loadRecipes", recipeMap });
	}, [recipes?.length]); // Only depend on length, not the array itself

	// Memoize dispatch callbacks to prevent re-creating functions on every render
	const updateIngredient = React.useCallback(
		(recipeId: string, ingredientId: string, include: boolean) => {
			dispatch({ type: "updateIngredient", recipeId, ingredientId, include });
		},
		[],
	);

	const updateRecipeServing = React.useCallback(
		(recipeId: string, numberOfServings: number) => {
			dispatch({ type: "updateRecipeServing", recipeId, numberOfServings });
		},
		[],
	);

	const updateFood = React.useCallback(
		(servingId: string, include: boolean) => {
			dispatch({ type: "updateFood", servingId, include });
		},
		[],
	);

	const createAndClose = async () => {
		const recipeItems = Object.keys(state.recipeMap).map((recipeId) => {
			const recipeEntry = state.recipeMap[recipeId];
			return {
				type: "RECIPE" as const,
				recipeId,
				numberOfServings: recipeEntry.numberOfServings,
				includedIngredientIds: Object.keys(recipeEntry.ingredientMap).filter(
					(ingId) => recipeEntry.ingredientMap[ingId],
				),
			};
		});

		const foodItems = Object.entries(state.foodMap)
			.filter(([, { include }]) => include)
			.map(([servingId, { food, numberOfServings }]) => {
				return {
					type: "FOOD" as const,
					foodId: food.id,
					servingId,
					numberOfServings,
				};
			});

		await createShoppingListItem([...recipeItems, ...foodItems]);
		onClose();
	};

	const isLoading = isLoadingRecipes;

	return (
		<View className="flex-1 gap-4">
			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" />
				</View>
			) : (
				<ScrollView className="flex-1" contentContainerClassName="gap-2 p-1">
					{Object.values(state.recipeMap).map(
						({ recipe, numberOfServings, ingredientMap }) => {
							return (
								<RecipeCheckList
									key={recipe.id}
									recipe={recipe}
									numberOfServings={numberOfServings}
									ingredientMap={ingredientMap}
									updateSelection={(ingId, newValue) =>
										updateIngredient(recipe.id, ingId, newValue)
									}
									updateServings={(newServings) =>
										updateRecipeServing(recipe.id, newServings)
									}
								/>
							);
						},
					)}

					{!!Object.entries(state.foodMap).length && (
						<View className="my-2 h-px bg-border" />
					)}

					{Object.entries(state.foodMap).map(
						([servingId, { food, numberOfServings, include }]) => {
							return (
								<FoodCheckbox
									key={servingId}
									food={food}
									servingId={servingId}
									numberOfServings={numberOfServings}
									included={include}
									updateIncluded={(include) => updateFood(servingId, include)}
								/>
							);
						},
					)}
				</ScrollView>
			)}

			<DialogFooter>
				<Button variant="outline" onPress={onClose}>
					Cancel
				</Button>
				<Button
					disabled={isLoading || isAddingShoppingListItems}
					onPress={createAndClose}
				>
					<Plus className="mr-2 h-4 w-4" />
					<Text>{isAddingShoppingListItems ? "Adding..." : "Add to List"}</Text>
				</Button>
			</DialogFooter>
		</View>
	);
};

export const AddShoppingItemsModal = ({
	itemsToAdd,
	isOpen,
	onClose,
}: {
	itemsToAdd: AddShoppingItemsData;
	isOpen: boolean;
	onClose: () => void;
}) => {
	const { lists } = useShoppingLists();
	const [selectedListId, setSelectedListId] = React.useState<string>();

	React.useEffect(() => {
		if (selectedListId || !lists) return;

		const defaultList = lists.find((list) => list.is_default);
		if (defaultList?.id) {
			setSelectedListId(defaultList.id);
		}
	}, [lists]);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-h-[80%] w-[90%] max-w-2xl">
				<DialogHeader>
					<DialogTitle>Add to Shopping List</DialogTitle>
				</DialogHeader>

				<View className="gap-2">
					<Select
						value={
							selectedListId
								? {
										value: selectedListId,
										label:
											lists?.find((l) => l.id === selectedListId)?.name || "",
									}
								: undefined
						}
						onValueChange={(option) => setSelectedListId(option?.value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select a shopping list" />
						</SelectTrigger>
						<SelectContent>
							{lists?.map((list) => (
								<SelectItem key={list.id} label={list.name} value={list.id} />
							))}
						</SelectContent>
					</Select>
				</View>

				{isOpen && selectedListId && (
					<ModalContent
						itemsToAdd={itemsToAdd}
						shoppingListId={selectedListId}
						onClose={onClose}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
};
