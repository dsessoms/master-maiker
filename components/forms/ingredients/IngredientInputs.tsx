import {
	EntityInput,
	EntityInputState,
	EntityInputValue,
} from "./IngredientEntityInput";

import { Image } from "@/components/image";
import { Ingredient } from "../../../lib/schemas";
import { Macros } from "../../meal-plan/macros";
import React from "react";
import { ShoppingBasket } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { plural } from "pluralize";
import { useParseIngredients } from "../../../hooks/recipes/use-parse-ingredients";

interface IngredientInputsProps {
	onIngredientsChange: (ingredients: Ingredient[]) => void;
	initialValues?: Ingredient[];
	recipeServings?: number;
}

export function IngredientInputs({
	onIngredientsChange,
	initialValues,
	recipeServings = 1,
}: IngredientInputsProps) {
	const { parseIngredients } = useParseIngredients();
	const [ingredients, setIngredients] = React.useState<
		(EntityInputValue<Ingredient> & { previouslyParsedRaw?: string })[]
	>(
		initialValues && initialValues.length > 0
			? [
					...initialValues.map((parsed) => {
						const raw = `${
							parsed.number_of_servings * parsed.serving.number_of_units
						} ${parsed.serving.measurement_description} ${parsed.name}`;

						return {
							state: EntityInputState.Parsed,
							raw,
							parsed,
							previouslyParsedRaw: raw,
						};
					}),
					{ state: EntityInputState.New, raw: "" },
				]
			: [{ state: EntityInputState.New, raw: "" }],
	);
	const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

	// Keep parent in sync with parsed ingredients
	React.useEffect(() => {
		const parsedIngredients = ingredients
			.filter(
				(ing) =>
					ing.state === EntityInputState.Parsed &&
					ing.parsed &&
					ing.raw.trim() !== "",
			)
			.map((ing) => ing.parsed!);
		onIngredientsChange(parsedIngredients);
	}, [ingredients, onIngredientsChange]);

	// Centralized ingredient update function
	const updateIngredients = React.useCallback(
		(options: {
			startIndex: number;
			updates?: Partial<
				EntityInputValue<Ingredient> & { previouslyParsedRaw?: string }
			>;
			additionalIngredients?: Array<
				EntityInputValue<Ingredient> & { previouslyParsedRaw?: string }
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

				return newIngredients;
			});

			// Handle focus logic
			if (focusNextNew) {
				const nextNewIndex = ingredients.findIndex(
					(ing, idx) => idx > startIndex && ing.state === EntityInputState.New,
				);
				if (nextNewIndex !== -1) {
					setFocusedIndex(nextNewIndex);
				}
			}
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

	return (
		<>
			{ingredients.map((ingredient, index) => {
				// Check if this ingredient should show fat secret editing UI
				const editingFatSecretId =
					ingredient.state === EntityInputState.Editing &&
					ingredient.parsed?.fat_secret_id
						? ingredient.parsed.fat_secret_id
						: undefined;

				return (
					<EntityInput<Ingredient>
						key={index}
						placeholder="something tasty"
						value={ingredient}
						editingFatSecretId={editingFatSecretId}
						onMultipleIngredientsPaste={async (ingredientLines) => {
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

							// Skip empty new ingredients
							if (
								currentIngredient.raw === "" &&
								currentIngredient.state === EntityInputState.New
							) {
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
						renderParsed={(parsed) => {
							const { name, number_of_servings, serving, image_url } = parsed;
							const displayedCount =
								number_of_servings * serving.number_of_units;

							// Calculate nutrition for the actual number of servings
							const totalCalories = serving.calories * number_of_servings;
							const totalCarbs =
								serving.carbohydrate_grams * number_of_servings;
							const totalProtein = serving.protein_grams * number_of_servings;
							const totalFat = serving.fat_grams * number_of_servings;

							// Calculate nutrition per recipe serving
							const caloriesPerServing = totalCalories / recipeServings;
							const carbsPerServing = totalCarbs / recipeServings;
							const proteinPerServing = totalProtein / recipeServings;
							const fatPerServing = totalFat / recipeServings;

							return (
								<View className="flex-1 min-h-[60px]">
									<View className="flex-row items-start py-2">
										{/* Thumbnail image or placeholder */}
										<View className="w-10 h-10 rounded-full mr-3 overflow-hidden justify-center items-center flex-shrink-0">
											{image_url ? (
												<Image
													source={{ uri: image_url }}
													className="w-[30px] h-[30px]"
													contentFit="contain"
												/>
											) : (
												<ShoppingBasket size={20} color="#666" />
											)}
										</View>

										<View className="flex-1 min-w-0">
											<View className="flex-row items-center flex-wrap mb-1">
												<Text className="font-bold text-base">
													{displayedCount}
												</Text>
												{serving.measurement_description ? (
													<Text className="font-bold text-base ml-1">
														{displayedCount === 1
															? serving.measurement_description
															: plural(serving.measurement_description)}
													</Text>
												) : null}
												<Text className="ml-2 text-base flex-shrink">
													{name}
												</Text>
											</View>
											<View>
												<Macros
													calories={caloriesPerServing}
													carbohydrate={carbsPerServing}
													protein={proteinPerServing}
													fat={fatPerServing}
												/>
											</View>
										</View>
									</View>
								</View>
							);
						}}
						shouldFocus={focusedIndex === index}
						onFocus={() => setFocusedIndex(null)}
					/>
				);
			})}
		</>
	);
}
