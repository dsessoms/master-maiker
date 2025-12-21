import { Header, Ingredient } from "@/lib/schemas";
import {
	StatefulInput,
	StatefulInputState,
	StatefulInputValue,
} from "@/components/forms/stateful-input/stateful-input";

import { Button } from "@/components/ui/button";
import { IngredientInput } from "@/components/forms/ingredients/ingredient-input";
import { Plus } from "@/lib/icons";
import { Pressable } from "react-native";
import React from "react";
import { Text } from "@/components/ui/text";
import { useParseIngredients } from "../../../hooks/recipes/use-parse-ingredients";

// Union type for ingredients or headers
type IngredientOrHeader = Ingredient | Header;

interface IngredientInputsProps {
	onIngredientsChange: (ingredients: IngredientOrHeader[]) => void;
	initialValues?: IngredientOrHeader[];
	recipeServings?: number;
}

type IngredientInputValue = StatefulInputValue<IngredientOrHeader> & {
	previouslyParsedRaw?: string;
};

type IngredientsAction =
	| {
			type: "UPDATE";
			index: number;
			updates: Partial<IngredientInputValue>;
	  }
	| {
			type: "DELETE";
			index: number;
	  }
	| {
			type: "INSERT";
			index: number;
			ingredient: IngredientInputValue;
			setFocus?: boolean;
	  }
	| {
			type: "MULTIPLE_UPDATE";
			startIndex: number;
			updates: Partial<IngredientInputValue>[];
			addNewAtEnd?: boolean;
	  }
	| {
			type: "CLEAR_FOCUS";
	  };

interface IngredientsState {
	ingredients: IngredientInputValue[];
	focusedIndex: number | null;
}

function ingredientsReducer(
	state: IngredientsState,
	action: IngredientsAction,
): IngredientsState {
	switch (action.type) {
		case "UPDATE": {
			const newIngredients = [...state.ingredients];
			const wasNew =
				state.ingredients[action.index].state === StatefulInputState.New;
			const isHeader = action.updates.parsed?.type === "header";

			Object.assign(newIngredients[action.index], action.updates);

			// Auto-add new ingredient at end if this was a New ingredient becoming Edit/View (but not for headers)
			if (
				wasNew &&
				!isHeader &&
				action.updates.state !== StatefulInputState.New
			) {
				newIngredients.push({
					state: StatefulInputState.New,
					raw: "",
				});
			}

			// Auto-focus when entering edit state
			const shouldFocus = action.updates.state === StatefulInputState.Edit;

			// After saving (View state), focus next new ingredient
			let focusedIndex = state.focusedIndex;
			if (action.updates.state === StatefulInputState.View) {
				const nextNewIndex = newIngredients.findIndex(
					(ing, idx) =>
						idx > action.index && ing.state === StatefulInputState.New,
				);
				focusedIndex = nextNewIndex !== -1 ? nextNewIndex : null;
			} else if (shouldFocus) {
				focusedIndex = action.index;
			}

			return {
				ingredients: newIngredients,
				focusedIndex,
			};
		}

		case "DELETE": {
			const newIngredients = [...state.ingredients];
			newIngredients.splice(action.index, 1);
			return {
				ingredients: newIngredients,
				focusedIndex: state.focusedIndex,
			};
		}

		case "INSERT": {
			const newIngredients = [...state.ingredients];
			newIngredients.splice(action.index, 0, action.ingredient);
			return {
				ingredients: newIngredients,
				focusedIndex: action.setFocus ? action.index : state.focusedIndex,
			};
		}

		case "MULTIPLE_UPDATE": {
			const newIngredients = [...state.ingredients];

			// Apply updates starting from startIndex
			action.updates.forEach((update, i) => {
				const targetIndex = action.startIndex + i;
				if (targetIndex < newIngredients.length) {
					// Update existing ingredient
					Object.assign(newIngredients[targetIndex], update);
				} else {
					// Insert new ingredient
					newIngredients.push({
						state: StatefulInputState.New,
						raw: "",
						...update,
					} as IngredientInputValue);
				}
			});

			// Add new ingredient at end if requested
			if (action.addNewAtEnd) {
				newIngredients.push({
					state: StatefulInputState.New,
					raw: "",
				});
			}

			// Set focus to the new ingredient at the end if we added multiple
			let focusedIndex = state.focusedIndex;
			if (action.addNewAtEnd && action.updates.length > 0) {
				focusedIndex = action.startIndex + action.updates.length;
			} else if (action.updates[0]?.state === StatefulInputState.Edit) {
				focusedIndex = action.startIndex;
			}

			return {
				ingredients: newIngredients,
				focusedIndex,
			};
		}

		case "CLEAR_FOCUS": {
			return {
				...state,
				focusedIndex: null,
			};
		}

		default:
			return state;
	}
}

function getInitialState(
	initialValues?: IngredientOrHeader[],
): IngredientsState {
	const ingredients: IngredientInputValue[] =
		initialValues && initialValues.length > 0
			? initialValues.map((parsed) => {
					// Handle headers differently from ingredients
					if (parsed.type === "header") {
						return {
							state: StatefulInputState.View,
							raw: parsed.name,
							parsed,
							previouslyParsedRaw: parsed.name,
						};
					}

					// Handle ingredients
					const ingredient = parsed as Ingredient;
					const displayName = ingredient.original_name || ingredient.name;
					return {
						state: StatefulInputState.View,
						raw: displayName,
						parsed: ingredient,
						previouslyParsedRaw: displayName,
					};
				})
			: [];

	// Always add a new empty ingredient at the end
	ingredients.push({ state: StatefulInputState.New, raw: "" });

	return {
		ingredients,
		focusedIndex: null,
	};
}

export function IngredientInputs({
	onIngredientsChange,
	initialValues,
	recipeServings = 1,
}: IngredientInputsProps) {
	const { parseIngredients } = useParseIngredients();
	const [{ ingredients, focusedIndex }, dispatch] = React.useReducer(
		ingredientsReducer,
		initialValues,
		getInitialState,
	);

	// Keep parent in sync with parsed ingredients and headers
	React.useEffect(() => {
		const parsedItems = ingredients
			.filter(
				(item) =>
					item.state === StatefulInputState.View &&
					item.parsed &&
					item.raw.trim() !== "",
			)
			.map((item) => item.parsed!);
		onIngredientsChange(parsedItems);
	}, [ingredients, onIngredientsChange]);

	// Parse ingredients helper
	const parseIngredientsAndUpdate = React.useCallback(
		async (ingredientLines: string[], startIndex: number) => {
			try {
				const response = await parseIngredients(ingredientLines);

				console.log("response", response);

				if (
					"ingredients" in response &&
					response.ingredients &&
					response.ingredients.length > 0
				) {
					const parsedIngredients = response.ingredients;

					// Update all parsed ingredients
					dispatch({
						type: "MULTIPLE_UPDATE",
						startIndex,
						updates: parsedIngredients.map((parsed) => {
							const displayName = parsed.original_name || parsed.name;
							return {
								state: StatefulInputState.View,
								parsed,
								raw: displayName,
								previouslyParsedRaw: displayName,
							};
						}),
					});
				}
			} catch (error) {
				console.error("Failed to parse ingredients:", error);
				// Revert to editing state on error
				dispatch({
					type: "MULTIPLE_UPDATE",
					startIndex,
					updates: ingredientLines.map(() => ({
						state: StatefulInputState.Edit,
					})),
				});
			}
		},
		[parseIngredients],
	);

	// Function to add a header above the first New ingredient input
	const addHeader = React.useCallback(() => {
		// Find the first ingredient with New state
		const firstNewIndex = ingredients.findIndex(
			(item) => item.state === StatefulInputState.New,
		);

		const headerItem = {
			state: StatefulInputState.New,
			raw: "",
			parsed: { type: "header", name: "" } as Header,
		};

		const insertIndex =
			firstNewIndex !== -1 ? firstNewIndex : ingredients.length;

		dispatch({
			type: "INSERT",
			index: insertIndex,
			ingredient: headerItem,
			setFocus: true,
		});
	}, [ingredients]);

	return (
		<>
			{ingredients.map((ingredient, index) => {
				// Handle headers separately
				if (ingredient.parsed?.type === "header") {
					const headerItem = ingredient.parsed as Header;

					if (ingredient.state === StatefulInputState.View) {
						return (
							<Pressable
								key={index}
								onPress={() => {
									dispatch({
										type: "UPDATE",
										index,
										updates: { state: StatefulInputState.Edit },
									});
								}}
								className="mb-2 min-h-[40px] rounded px-2 py-1 active:bg-muted/50"
							>
								<Text className="text-lg font-semibold text-foreground">
									{headerItem.name}
								</Text>
							</Pressable>
						);
					}

					// Render header input for editing/new states
					return (
						<StatefulInput<Header>
							key={index}
							placeholder="Header name (e.g., 'For the sauce')"
							value={ingredient as StatefulInputValue<Header>}
							onChange={(rawValue) => {
								dispatch({
									type: "UPDATE",
									index,
									updates: {
										raw: rawValue,
										parsed: { type: "header", name: rawValue } as Header,
									},
								});
							}}
							onSave={() => {
								if (ingredient.raw.trim()) {
									dispatch({
										type: "UPDATE",
										index,
										updates: {
											state: StatefulInputState.View,
											parsed: {
												type: "header",
												name: ingredient.raw,
											} as Header,
										},
									});
								} else {
									// Delete empty header
									dispatch({ type: "DELETE", index });
								}
							}}
							onEdit={() => {
								dispatch({
									type: "UPDATE",
									index,
									updates: { state: StatefulInputState.Edit },
								});
							}}
							onCancel={() => {
								dispatch({
									type: "UPDATE",
									index,
									updates: { state: StatefulInputState.View },
								});
							}}
							onClear={() => {
								dispatch({ type: "DELETE", index });
							}}
							renderParsed={(parsed) => (
								<Text className="text-lg font-semibold text-foreground">
									{parsed.name}
								</Text>
							)}
							shouldFocus={focusedIndex === index}
							onFocus={() => dispatch({ type: "CLEAR_FOCUS" })}
						/>
					);
				}

				return (
					<IngredientInput
						key={index}
						placeholder="something tasty"
						value={ingredient as StatefulInputValue<Ingredient>}
						recipeServings={recipeServings}
						onMultiplePaste={async (ingredientLines) => {
							// Set current ingredient to parsing and add additional parsing ingredients
							dispatch({
								type: "MULTIPLE_UPDATE",
								startIndex: index,
								updates: [
									{
										raw: ingredientLines[0] || "",
										state: StatefulInputState.Load,
									},
									...ingredientLines.slice(1).map((line) => ({
										state: StatefulInputState.Load as const,
										raw: line,
									})),
								],
								addNewAtEnd: true,
							});

							// Parse all pasted ingredients
							await parseIngredientsAndUpdate(ingredientLines, index);
						}}
						onFoodSelect={(foodData) => {
							// Convert FoodData to Ingredient format
							const ingredient: Ingredient = {
								type: "ingredient",
								name: foodData.food.food_name,
								original_name: foodData.originalName,
								number_of_servings: foodData.amount,
								meta:
									foodData.originalName &&
									foodData.originalName !== foodData.food.food_name
										? foodData.originalName
										: undefined,
								image_url: undefined,
								fat_secret_id: foodData.fat_secret_id,
								serving: {
									measurement_description:
										foodData.food.food_type === "Generic"
											? foodData.serving.measurement_description
											: foodData.serving.serving_description,
									serving_description: foodData.serving.serving_description,
									number_of_units: foodData.serving.number_of_units,
									calories: foodData.serving.calories,
									carbohydrate_grams: foodData.serving.carbohydrate,
									fat_grams: foodData.serving.fat,
									protein_grams: foodData.serving.protein,
									fat_secret_id: foodData.serving.serving_id,
								},
							};

							const displayName = ingredient.original_name || ingredient.name;

							dispatch({
								type: "UPDATE",
								index,
								updates: {
									state: StatefulInputState.View,
									parsed: ingredient,
									raw: displayName,
									previouslyParsedRaw: displayName,
								},
							});
						}}
						onChange={(rawValue) => {
							dispatch({
								type: "UPDATE",
								index,
								updates: {
									raw: rawValue,
									state: StatefulInputState.Edit,
								},
							});
						}}
						onSave={async () => {
							const currentIngredient = ingredients[index];

							if (
								currentIngredient.raw.trim() === "" &&
								currentIngredient.state === StatefulInputState.New
							) {
								return;
							}

							// Delete empty ingredients
							if (currentIngredient.raw.trim() === "") {
								dispatch({ type: "DELETE", index });
								return;
							}

							// Handle unchanged previously parsed ingredients
							if (
								currentIngredient.previouslyParsedRaw === currentIngredient.raw
							) {
								dispatch({
									type: "UPDATE",
									index,
									updates: { state: StatefulInputState.View },
								});
								return;
							}

							// Set to parsing state
							dispatch({
								type: "UPDATE",
								index,
								updates: { state: StatefulInputState.Load },
							});

							// Parse the ingredient
							await parseIngredientsAndUpdate([currentIngredient.raw], index);
						}}
						onEdit={() => {
							dispatch({
								type: "UPDATE",
								index,
								updates: { state: StatefulInputState.Edit },
							});
						}}
						onCancel={() => {
							dispatch({
								type: "UPDATE",
								index,
								updates: { state: StatefulInputState.View },
							});
						}}
						onClear={() => {
							dispatch({ type: "DELETE", index });
						}}
						shouldFocus={focusedIndex === index}
						onFocus={() => dispatch({ type: "CLEAR_FOCUS" })}
					/>
				);
			})}

			<Button
				variant="outline"
				onPress={addHeader}
				className="mt-2 flex-row self-start"
			>
				<Plus className="text-primary" size={15} />
				<Text>Header</Text>
			</Button>
		</>
	);
}
