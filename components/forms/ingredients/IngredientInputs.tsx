import {
	EntityInput,
	EntityInputState,
	EntityInputValue,
} from "@/components/forms/entity-input";
import { Header, Ingredient } from "@/lib/schemas";
import { Plus, ShoppingBasket } from "@/lib/icons";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Image } from "@/components/image";
import { IngredientInput } from "@/components/forms/ingredients/ingredient-input";
import { Macros } from "../../meal-plan/macros";
import React from "react";
import { Text } from "@/components/ui/text";
import { plural } from "pluralize";
import { useParseIngredients } from "../../../hooks/recipes/use-parse-ingredients";

// Union type for ingredients or headers
type IngredientOrHeader = Ingredient | Header;

interface IngredientInputsProps {
	onIngredientsChange: (ingredients: IngredientOrHeader[]) => void;
	initialValues?: IngredientOrHeader[];
	recipeServings?: number;
}

export function IngredientInputs({
	onIngredientsChange,
	initialValues,
	recipeServings = 1,
}: IngredientInputsProps) {
	const { parseIngredients } = useParseIngredients();
	const [ingredients, setIngredients] = React.useState<
		(EntityInputValue<IngredientOrHeader> & { previouslyParsedRaw?: string })[]
	>(
		initialValues && initialValues.length > 0
			? [
					...initialValues.map((parsed) => {
						// Handle headers differently from ingredients
						if (parsed.type === "header") {
							return {
								state: EntityInputState.Parsed,
								raw: parsed.name,
								parsed,
								previouslyParsedRaw: parsed.name,
							};
						}

						// Handle ingredients
						const ingredient = parsed as Ingredient;
						const raw = `${
							ingredient.number_of_servings * ingredient.serving.number_of_units
						} ${ingredient.serving.measurement_description} ${ingredient.name}`;

						return {
							state: EntityInputState.Parsed,
							raw,
							parsed: ingredient,
							previouslyParsedRaw: raw,
						};
					}),
					{ state: EntityInputState.New, raw: "" },
				]
			: [{ state: EntityInputState.New, raw: "" }],
	);
	const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

	// Keep parent in sync with parsed ingredients and headers
	React.useEffect(() => {
		const parsedItems = ingredients
			.filter(
				(item) =>
					item.state === EntityInputState.Parsed &&
					item.parsed &&
					item.raw.trim() !== "",
			)
			.map((item) => item.parsed!);
		onIngredientsChange(parsedItems);
	}, [ingredients, onIngredientsChange]);

	// Centralized ingredient update function
	const updateIngredients = React.useCallback(
		(options: {
			startIndex: number;
			updates?: Partial<
				EntityInputValue<IngredientOrHeader> & { previouslyParsedRaw?: string }
			>;
			additionalIngredients?: Array<
				EntityInputValue<IngredientOrHeader> & { previouslyParsedRaw?: string }
			>;
			addNewAtEnd?: boolean;
			focusNextNew?: boolean;
		}) => {
			const {
				startIndex,
				updates = {},
				additionalIngredients,
				addNewAtEnd,
				focusNextNew,
			} = options;

			setIngredients((prev) => {
				const newIngredients = [...prev];

				// Update the ingredient at startIndex
				Object.assign(newIngredients[startIndex], updates);

				// Insert additional ingredients after startIndex if provided
				if (additionalIngredients && additionalIngredients.length > 0) {
					newIngredients.splice(startIndex + 1, 0, ...additionalIngredients);
				}

				// Add new ingredient at end if requested
				if (addNewAtEnd) {
					newIngredients.push({
						state: EntityInputState.New,
						raw: "",
					});
				}

				if (updates.state === EntityInputState.Editing) {
					setFocusedIndex(startIndex);
				} else if (
					focusNextNew &&
					!newIngredients.some((ing) => ing.state === EntityInputState.Editing)
				) {
					const nextNewIndex = ingredients.findIndex(
						(ing, idx) =>
							idx > startIndex && ing.state === EntityInputState.New,
					);
					if (nextNewIndex !== -1) {
						setFocusedIndex(nextNewIndex);
					}
				}

				return newIngredients;
			});
		},
		[ingredients],
	);

	// Parse ingredients helper
	const parseIngredientsAndUpdate = React.useCallback(
		async (ingredientLines: string[], startIndex: number) => {
			try {
				const response = await parseIngredients(ingredientLines);

				if (
					"ingredients" in response &&
					response.ingredients &&
					response.ingredients.length > 0
				) {
					const parsedIngredients = response.ingredients;

					setIngredients((prev) => {
						const newIngredients = [...prev];

						parsedIngredients.forEach((parsed, i) => {
							const ingredientIndex = startIndex + i;
							if (ingredientIndex < newIngredients.length) {
								const ingredient = newIngredients[ingredientIndex];
								const raw = `${parsed.number_of_servings * parsed.serving.number_of_units} ${parsed.serving.measurement_description} ${parsed.name}`;

								Object.assign(ingredient, {
									state: EntityInputState.Parsed,
									parsed,
									raw,
									previouslyParsedRaw: raw,
								});
							}
						});

						return newIngredients;
					});
				}
			} catch (error) {
				console.error("Failed to parse ingredients:", error);
				// Revert to editing state on error
				setIngredients((prev) => {
					const newIngredients = [...prev];
					ingredientLines.forEach((_, i) => {
						const ingredientIndex = startIndex + i;
						if (ingredientIndex < newIngredients.length) {
							newIngredients[ingredientIndex].state = EntityInputState.Editing;
						}
					});
					return newIngredients;
				});
			}
		},
		[parseIngredients],
	);

	// Function to add a header above the first New ingredient input
	const addHeader = React.useCallback(() => {
		setIngredients((prev) => {
			// Find the first ingredient with New state
			const firstNewIndex = prev.findIndex(
				(item) => item.state === EntityInputState.New,
			);

			const newIngredients = [...prev];
			const headerItem = {
				state: EntityInputState.New,
				raw: "",
				parsed: { type: "header", name: "" } as Header,
			};

			if (firstNewIndex !== -1) {
				// Insert header before the first New ingredient
				newIngredients.splice(firstNewIndex, 0, headerItem);
				setFocusedIndex(firstNewIndex);
			} else {
				// If no New ingredient found, add at the end
				newIngredients.push(headerItem);
				setFocusedIndex(newIngredients.length - 1);
			}

			return newIngredients;
		});
	}, []);

	return (
		<>
			{ingredients.map((ingredient, index) => {
				// Handle headers separately
				if (ingredient.parsed?.type === "header") {
					const headerItem = ingredient.parsed as Header;

					if (ingredient.state === EntityInputState.Parsed) {
						return (
							<Pressable
								key={index}
								onPress={() => {
									updateIngredients({
										startIndex: index,
										updates: { state: EntityInputState.Editing },
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
						<EntityInput<Header>
							key={index}
							placeholder="Header name (e.g., 'For the sauce')"
							value={ingredient as EntityInputValue<Header>}
							onChange={(rawValue) => {
								updateIngredients({
									startIndex: index,
									updates: {
										raw: rawValue,
										parsed: { type: "header", name: rawValue } as Header,
									},
								});
							}}
							onSave={() => {
								if (ingredient.raw.trim()) {
									updateIngredients({
										startIndex: index,
										updates: {
											state: EntityInputState.Parsed,
											parsed: {
												type: "header",
												name: ingredient.raw,
											} as Header,
										},
										focusNextNew: true,
									});
								} else {
									// Delete empty header
									setIngredients((prev) => {
										const newIngredients = [...prev];
										newIngredients.splice(index, 1);
										return newIngredients;
									});
								}
							}}
							onEdit={() => {
								updateIngredients({
									startIndex: index,
									updates: { state: EntityInputState.Editing },
								});
							}}
							onCancel={() => {
								updateIngredients({
									startIndex: index,
									updates: { state: EntityInputState.Parsed },
								});
							}}
							onClear={() => {
								setIngredients((prev) => {
									const newIngredients = [...prev];
									newIngredients.splice(index, 1);
									return newIngredients;
								});
							}}
							renderParsed={(parsed) => (
								<Text className="text-lg font-semibold text-foreground">
									{parsed.name}
								</Text>
							)}
							shouldFocus={focusedIndex === index}
							onFocus={() => setFocusedIndex(null)}
						/>
					);
				}

				// Handle ingredients (existing logic)
				// Check if this ingredient should show fat secret editing UI
				const editingFatSecretId =
					ingredient.state === EntityInputState.Editing &&
					ingredient.parsed?.type === "ingredient" &&
					(ingredient.parsed as Ingredient)?.fat_secret_id
						? (ingredient.parsed as Ingredient).fat_secret_id
						: undefined;

				return (
					<IngredientInput
						key={index}
						placeholder="something tasty"
						value={ingredient as EntityInputValue<Ingredient>}
						recipeServings={recipeServings}
						onMultiplePaste={async (ingredientLines) => {
							// Set current ingredient to parsing and add additional parsing ingredients
							updateIngredients({
								startIndex: index,
								updates: {
									raw: ingredientLines[0] || "",
									state: EntityInputState.Parsing,
								},
								additionalIngredients: ingredientLines.slice(1).map((line) => ({
									state: EntityInputState.Parsing as const,
									raw: line,
								})),
								addNewAtEnd: true,
							});

							// Focus on the new input
							setFocusedIndex(index + ingredientLines.length);

							// Parse all pasted ingredients
							await parseIngredientsAndUpdate(ingredientLines, index);
						}}
						onFoodSelect={(foodData) => {
							// Convert FoodData to Ingredient format
							const ingredient: Ingredient = {
								type: "ingredient",
								name: foodData.food.food_name,
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

							const wasNewState =
								ingredients[index].state === EntityInputState.New;
							const raw = `${ingredient.number_of_servings * ingredient.serving.number_of_units} ${ingredient.serving.measurement_description} ${ingredient.name}`;

							updateIngredients({
								startIndex: index,
								updates: {
									state: EntityInputState.Parsed,
									parsed: ingredient,
									raw,
									previouslyParsedRaw: raw,
								},
								addNewAtEnd: wasNewState,
							});

							// Focus on next NEW ingredient if this was a new ingredient
							if (wasNewState) {
								setFocusedIndex(index + 1);
							}
						}}
						onChange={(rawValue) => {
							const currentIngredient = ingredients[index];
							const wasNew = currentIngredient.state === EntityInputState.New;

							updateIngredients({
								startIndex: index,
								updates: {
									raw: rawValue,
									state: wasNew
										? EntityInputState.Dirty
										: currentIngredient.state,
								},
								addNewAtEnd: wasNew,
							});
						}}
						onSave={async () => {
							const currentIngredient = ingredients[index];

							if (
								currentIngredient.raw.trim() === "" &&
								currentIngredient.state === EntityInputState.New
							) {
								return;
							}

							// Delete empty ingredients
							if (currentIngredient.raw.trim() === "") {
								setIngredients((prev) => {
									const newIngredients = [...prev];
									newIngredients.splice(index, 1);
									return newIngredients;
								});
								return;
							}

							// Focus next NEW ingredient immediately
							updateIngredients({ startIndex: index, focusNextNew: true });

							// Handle unchanged previously parsed ingredients
							if (
								currentIngredient.previouslyParsedRaw === currentIngredient.raw
							) {
								updateIngredients({
									startIndex: index,
									updates: { state: EntityInputState.Parsed },
								});
								return;
							}

							// Set to parsing state
							updateIngredients({
								startIndex: index,
								updates: { state: EntityInputState.Parsing },
							});

							// Parse the ingredient
							await parseIngredientsAndUpdate([currentIngredient.raw], index);
						}}
						onEdit={() => {
							updateIngredients({
								startIndex: index,
								updates: { state: EntityInputState.Editing },
							});
						}}
						onCancel={() => {
							updateIngredients({
								startIndex: index,
								updates: { state: EntityInputState.Parsed },
							});
						}}
						onClear={() => {
							setIngredients((prev) => {
								const newIngredients = [...prev];
								newIngredients.splice(index, 1);
								return newIngredients;
							});
						}}
						shouldFocus={focusedIndex === index}
						onFocus={() => setFocusedIndex(null)}
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
