import { Header, Ingredient } from "@/lib/schemas";
import {
	StatefulInput,
	StatefulInputState,
	StatefulInputValue,
} from "@/components/forms/stateful-input/stateful-input";

import { Button } from "@/components/ui/button";
import { IngredientInput } from "@/components/forms/ingredients/ingredient-input";
import { GripVertical, Plus } from "@/lib/icons";
import { Pressable, View } from "react-native";
import React from "react";
import { Text } from "@/components/ui/text";
import { useParseIngredients } from "../../../hooks/recipes/use-parse-ingredients";
import Animated, { AnimatedRef } from "react-native-reanimated";
import type { SortableGridRenderItem } from "react-native-sortables";
import Sortable from "react-native-sortables";
import { v4 as uuidv4 } from "uuid";

// Union type for ingredients or headers
type IngredientOrHeader = Ingredient | Header;

interface IngredientInputsProps {
	onIngredientsChange: (ingredients: IngredientOrHeader[]) => void;
	initialValues?: IngredientOrHeader[];
	recipeServings?: number;
	scrollableRef?: AnimatedRef<any>;
}

type IngredientInputValue = StatefulInputValue<IngredientOrHeader> & {
	previouslyParsedRaw?: string;
	id: string;
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
	  }
	| {
			type: "MULTIPLE_UPDATE";
			startIndex: number;
			updates: Partial<IngredientInputValue>[];
			addNewAtEnd?: boolean;
	  }
	| {
			type: "REORDER";
			from: number;
			to: number;
	  };

interface IngredientsState {
	ingredients: IngredientInputValue[];
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
					id: uuidv4(),
				});
			}

			return {
				ingredients: newIngredients,
			};
		}

		case "DELETE": {
			const newIngredients = [...state.ingredients];
			newIngredients.splice(action.index, 1);
			return {
				ingredients: newIngredients,
			};
		}

		case "INSERT": {
			const newIngredients = [...state.ingredients];
			newIngredients.splice(action.index, 0, action.ingredient);
			return {
				ingredients: newIngredients,
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
						id: uuidv4(),
						...update,
					} as IngredientInputValue);
				}
			});

			// Add new ingredient at end if requested
			if (action.addNewAtEnd) {
				newIngredients.push({
					state: StatefulInputState.New,
					raw: "",
					id: uuidv4(),
				});
			}

			return {
				ingredients: newIngredients,
			};
		}

		case "REORDER": {
			const { from, to } = action;

			if (from < 0 || to < 0 || from >= state.ingredients.length) {
				return state; // Invalid index, do nothing
			}

			const newIngredients = [...state.ingredients];
			const [movedItem] = newIngredients.splice(from, 1);
			newIngredients.splice(to, 0, movedItem);

			return {
				ingredients: newIngredients,
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
							id: uuidv4(),
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
						id: uuidv4(),
					};
				})
			: [];

	// Always add a new empty ingredient at the end
	ingredients.push({
		state: StatefulInputState.New,
		raw: "",
		id: uuidv4(),
	});

	return {
		ingredients,
	};
}

export function IngredientInputs({
	onIngredientsChange,
	initialValues,
	recipeServings = 1,
	scrollableRef,
}: IngredientInputsProps) {
	const { parseIngredients } = useParseIngredients();
	const [{ ingredients }, dispatch] = React.useReducer(
		ingredientsReducer,
		initialValues,
		getInitialState,
	);
	const sortEnabled = ingredients.every(
		(ingredient) => ingredient.state !== StatefulInputState.Edit,
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
			state: StatefulInputState.Edit,
			raw: "",
			parsed: { type: "header", name: "" } as Header,
			id: uuidv4(),
		};

		const insertIndex =
			firstNewIndex !== -1 ? firstNewIndex : ingredients.length;

		dispatch({
			type: "INSERT",
			index: insertIndex,
			ingredient: headerItem,
		});
	}, [ingredients]);

	const renderItem = React.useCallback<
		SortableGridRenderItem<IngredientInputValue>
	>(
		({ item: ingredient, index }) => {
			// Handle headers separately
			if (ingredient.parsed?.type === "header") {
				// Render header input for editing/new states
				return (
					<StatefulInput<Header>
						key={ingredient.id}
						placeholder="Header name (e.g., 'For the sauce')"
						value={ingredient as StatefulInputValue<Header>}
						onChange={(rawValue) => {
							dispatch({
								type: "UPDATE",
								index,
								updates: {
									state: StatefulInputState.Edit,
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
						renderParsed={(parsed, onEdit) => (
							<View className="flex-row justify-between w-full bg-background rounded-md">
								<Pressable onPress={onEdit}>
									<Text className="text-foreground font-semibold select-none">
										{parsed.name}
									</Text>
								</Pressable>
								<Sortable.Handle>
									<GripVertical size={20} color="#666" />
								</Sortable.Handle>
							</View>
						)}
					/>
				);
			}

			return (
				<IngredientInput
					key={ingredient.id}
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
				/>
			);
		},
		[ingredients, parseIngredientsAndUpdate, recipeServings],
	);

	return (
		<>
			<Sortable.Grid
				data={ingredients}
				renderItem={renderItem}
				onDragEnd={({ fromIndex, toIndex }) =>
					dispatch({ type: "REORDER", from: fromIndex, to: toIndex })
				}
				keyExtractor={(item) => item.id}
				columns={1}
				rowGap={8}
				scrollableRef={scrollableRef}
				sortEnabled={sortEnabled}
				enableActiveItemSnap={false}
				activeItemShadowOpacity={0}
				autoScrollEnabled
				customHandle
			/>

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
