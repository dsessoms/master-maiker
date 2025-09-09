import {
	EntityInput,
	EntityInputState,
	EntityInputValue,
} from "./IngredientInput";

import { Ingredient } from "../../lib/schemas";
import { Macros } from "../meal-plan/macros";
import React from "react";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { Image } from "@/components/image";
import { plural } from "pluralize";
import { useParseIngredients } from "../../hooks/recipes/use-parse-ingredients";

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
	const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);
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

	return (
		<>
			{ingredients.map((ingredient, index) => (
				<EntityInput<Ingredient>
					key={index}
					placeholder="something tasty"
					value={ingredient}
					shouldFocus={focusedIndex === index}
					onFocus={() => setFocusedIndex(null)}
					onChange={(rawValue) => {
						const newIngredients = [...ingredients];
						const currentIngredient = newIngredients[index];
						currentIngredient.raw = rawValue;
						if (currentIngredient.state === EntityInputState.New) {
							currentIngredient.state = EntityInputState.Dirty;
							newIngredients.push({
								state: EntityInputState.New,
								raw: "",
							});
						}
						setIngredients(newIngredients);
						// Clear focus state when user starts typing
						if (focusedIndex === index) {
							setFocusedIndex(null);
						}
					}}
					onSave={async () => {
						// Focus the next ingredient immediately when user presses enter/tab
						const nextIndex = index + 1;
						if (nextIndex < ingredients.length) {
							setFocusedIndex(nextIndex);
						}

						const currentIngredient = ingredients[index];

						if (currentIngredient.raw === "" && EntityInputState.New) {
							return;
						}

						setIngredients((prevIngredients) => {
							const newIngredients = [...prevIngredients];
							const currentIngredient = newIngredients[index];
							if (
								currentIngredient.previouslyParsedRaw === currentIngredient.raw
							) {
								currentIngredient.state = EntityInputState.Parsed;
								return newIngredients;
							}
							currentIngredient.state = EntityInputState.Parsing;
							return newIngredients;
						});

						if (
							currentIngredient.previouslyParsedRaw === currentIngredient.raw
						) {
							return;
						}

						try {
							const response = await parseIngredients([ingredients[index].raw]);

							if (
								"ingredients" in response &&
								response.ingredients &&
								response.ingredients.length > 0
							) {
								const parsedIngredient = response.ingredients[0];

								setIngredients((prevIngredients) => {
									const newIngredients = [...prevIngredients];
									const currentIngredient = newIngredients[index];
									currentIngredient.state = EntityInputState.Parsed;
									currentIngredient.parsed = parsedIngredient;
									currentIngredient.previouslyParsedRaw = currentIngredient.raw;
									return newIngredients;
								});
							} else {
								throw new Error("No parsed ingredient returned");
							}
						} catch (error) {
							// Handle parsing error - revert to editing state
							setIngredients((prevIngredients) => {
								const newIngredients = [...prevIngredients];
								const currentIngredient = newIngredients[index];
								currentIngredient.state = EntityInputState.Editing;
								return newIngredients;
							});
						}
					}}
					onEdit={() => {
						const newIngredients = [...ingredients];
						const currentIngredient = newIngredients[index];
						currentIngredient.state = EntityInputState.Editing;
						setIngredients(newIngredients);
					}}
					onClear={() => {
						const newIngredients = [...ingredients];
						newIngredients.splice(index, 1);
						setIngredients(newIngredients);
					}}
					renderParsed={(parsed) => {
						const { name, number_of_servings, serving, image_url } = parsed;
						const displayedCount = number_of_servings * serving.number_of_units;

						// Calculate nutrition for the actual number of servings
						const totalCalories = serving.calories * number_of_servings;
						const totalCarbs = serving.carbohydrate_grams * number_of_servings;
						const totalProtein = serving.protein_grams * number_of_servings;
						const totalFat = serving.fat_grams * number_of_servings;

						// Calculate nutrition per recipe serving
						const caloriesPerServing = totalCalories / recipeServings;
						const carbsPerServing = totalCarbs / recipeServings;
						const proteinPerServing = totalProtein / recipeServings;
						const fatPerServing = totalFat / recipeServings;

						return (
							<View>
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										flexWrap: "wrap",
									}}
								>
									{/* Thumbnail image or placeholder */}
									<View
										style={{
											width: 40,
											height: 40,
											borderRadius: 20,
											marginRight: 12,
											backgroundColor: image_url ? "transparent" : "#e5e5e5",
											overflow: "hidden",
											justifyContent: "center",
											alignItems: "center",
										}}
									>
										{image_url ? (
											<Image
												source={{ uri: image_url }}
												style={{
													width: 30,
													height: 30,
												}}
												contentFit="contain"
											/>
										) : null}
									</View>

									<View style={{ flex: 1 }}>
										<View
											style={{
												flexDirection: "row",
												alignItems: "center",
												flexWrap: "wrap",
											}}
										>
											<Text style={{ fontWeight: "bold", fontSize: 16 }}>
												{displayedCount}
											</Text>
											{serving.measurement_description ? (
												<Text
													style={{
														fontWeight: "bold",
														fontSize: 16,
														marginLeft: 4,
													}}
												>
													{displayedCount === 1
														? serving.measurement_description
														: plural(serving.measurement_description)}
												</Text>
											) : null}
											<Text style={{ marginLeft: 8, fontSize: 16 }}>
												{name}
											</Text>
										</View>
										<View style={{ marginTop: 4 }}>
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
				/>
			))}
		</>
	);
}
