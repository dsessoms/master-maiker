import {
	EntityInput,
	EntityInputState,
	EntityInputValue,
} from "./IngredientInput";

import { Ingredient } from "../../lib/schemas";
import React from "react";
import { Text } from "@/components/ui/text";
import { plural } from "pluralize";
import { useParseIngredient } from "../../hooks/recipes/use-parse-ingredient";

interface IngredientInputsProps {
	onIngredientsChange: (ingredients: Ingredient[]) => void;
	initialValues?: Ingredient[];
}

export function IngredientInputs({
	onIngredientsChange,
	initialValues,
}: IngredientInputsProps) {
	const { parseIngredient } = useParseIngredient();
	const [ingredients, setIngredients] = React.useState<
		(EntityInputValue<Ingredient> & { previouslyParsedRaw?: string })[]
	>(
		initialValues && initialValues.length > 0
			? [
					...initialValues.map((parsed) => {
						const raw = `${
							parsed.numberOfServings * parsed.serving.numberOfUnits
						} ${parsed.serving.measurementDescription} ${parsed.name}`;

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
					}}
					onSave={async () => {
						if (ingredients[index].raw === "" && EntityInputState.New) {
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

						try {
							const parsedIngredient = await parseIngredient(
								ingredients[index].raw,
							);

							setIngredients((prevIngredients) => {
								const newIngredients = [...prevIngredients];
								const currentIngredient = newIngredients[index];
								currentIngredient.state = EntityInputState.Parsed;
								currentIngredient.parsed = {
									type: "ingredient",
									...parsedIngredient,
								} as Ingredient;
								currentIngredient.previouslyParsedRaw = currentIngredient.raw;
								return newIngredients;
							});
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
					renderParsed={(parsed) => {
						const { name, numberOfServings, serving } = parsed;
						const displayedCount = numberOfServings * serving.numberOfUnits;
						return (
							<>
								<Text style={{ fontWeight: "bold", fontSize: 16 }}>
									{displayedCount}
								</Text>
								{serving.measurementDescription ? (
									<Text
										style={{
											fontWeight: "bold",
											fontSize: 16,
											marginLeft: 4,
										}}
									>
										{displayedCount === 1
											? serving.measurementDescription
											: plural(serving.measurementDescription)}
									</Text>
								) : null}
								<Text style={{ marginLeft: 8, fontSize: 16 }}>{name}</Text>
							</>
						);
					}}
				/>
			))}
		</>
	);
}
