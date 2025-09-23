import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	View,
} from "react-native";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { X } from "@/lib/icons";
import { router } from "expo-router";
import { useCreateRecipeMutation } from "@/hooks/recipes/use-create-recipe-mutation";
import { useGenerateRecipeMutation } from "@/hooks/recipes/use-generate-recipe-mutation";

interface IngredientChip {
	id: string;
	name: string;
}

export default function GenerateRecipe() {
	const [ingredientsToInclude, setIngredientsToInclude] = useState<
		IngredientChip[]
	>([]);
	const [ingredientsToExclude, setIngredientsToExclude] = useState<
		IngredientChip[]
	>([]);
	const [includeInput, setIncludeInput] = useState("");
	const [excludeInput, setExcludeInput] = useState("");
	const [complexity, setComplexity] = useState<
		"simple" | "moderate" | "complex"
	>("moderate");
	const [additionalRequirements, setAdditionalRequirements] = useState("");

	const { generateRecipe, isPending: isGenerating } =
		useGenerateRecipeMutation();
	const { createRecipe } = useCreateRecipeMutation();

	const addIngredientToInclude = () => {
		if (includeInput.trim()) {
			const newIngredient: IngredientChip = {
				id: Date.now().toString(),
				name: includeInput.trim(),
			};
			setIngredientsToInclude([...ingredientsToInclude, newIngredient]);
			setIncludeInput("");
		}
	};

	const addIngredientToExclude = () => {
		if (excludeInput.trim()) {
			const newIngredient: IngredientChip = {
				id: Date.now().toString(),
				name: excludeInput.trim(),
			};
			setIngredientsToExclude([...ingredientsToExclude, newIngredient]);
			setExcludeInput("");
		}
	};

	const removeIngredientToInclude = (id: string) => {
		setIngredientsToInclude(
			ingredientsToInclude.filter((ing) => ing.id !== id),
		);
	};

	const removeIngredientToExclude = (id: string) => {
		setIngredientsToExclude(
			ingredientsToExclude.filter((ing) => ing.id !== id),
		);
	};

	const handleGenerateRecipe = async () => {
		try {
			const options = {
				ingredientsToInclude: ingredientsToInclude.map((ing) => ing.name),
				ingredientsToExclude: ingredientsToExclude.map((ing) => ing.name),
				complexity,
				additionalRequirements: additionalRequirements.trim() || undefined,
			};

			const result = await generateRecipe(options);

			if (result.recipe) {
				// Save the generated recipe
				const savedRecipe = await createRecipe(result.recipe);

				// Navigate to the saved recipe
				router.replace(`/recipes/${savedRecipe.id}`);
			} else {
				console.error("Failed to generate recipe - no recipe returned");
				// TODO: You might want to show an error toast here
			}
		} catch (error) {
			console.error("Error generating recipe:", error);
			// TODO: You might want to show an error toast here
		}
	};

	const IngredientChips = ({
		ingredients,
		onRemove,
	}: {
		ingredients: IngredientChip[];
		onRemove: (id: string) => void;
	}) => (
		<View className="flex-row flex-wrap gap-2 mt-2">
			{ingredients.map((ingredient) => (
				<View
					key={ingredient.id}
					className="flex-row items-center bg-secondary rounded-full px-3 py-1 gap-1"
				>
					<Text className="text-sm">{ingredient.name}</Text>
					<Pressable
						onPress={() => onRemove(ingredient.id)}
						className="ml-1 p-0.5"
					>
						<X size={12} className="text-muted-foreground" />
					</Pressable>
				</View>
			))}
		</View>
	);

	return (
		<SafeAreaView className="flex-1 bg-background">
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<ScrollView
					className="flex-1"
					contentContainerStyle={{ padding: 16 }}
					keyboardShouldPersistTaps="handled"
				>
					<View className="space-y-6">
						{/* Include Ingredients */}
						<View>
							<Label nativeID="include-ingredients">
								Ingredients to Include
							</Label>
							<Input
								placeholder="Type an ingredient and press Enter"
								value={includeInput}
								onChangeText={setIncludeInput}
								onSubmitEditing={addIngredientToInclude}
								returnKeyType="done"
								className="mt-2"
							/>
							<IngredientChips
								ingredients={ingredientsToInclude}
								onRemove={removeIngredientToInclude}
							/>
						</View>

						{/* Exclude Ingredients */}
						<View>
							<Label nativeID="exclude-ingredients">
								Ingredients to Exclude
							</Label>
							<Input
								placeholder="Type an ingredient and press Enter"
								value={excludeInput}
								onChangeText={setExcludeInput}
								onSubmitEditing={addIngredientToExclude}
								returnKeyType="done"
								className="mt-2"
							/>
							<IngredientChips
								ingredients={ingredientsToExclude}
								onRemove={removeIngredientToExclude}
							/>
						</View>

						{/* Complexity */}
						<View>
							<Label nativeID="complexity">Complexity Level</Label>
							<RadioGroup
								value={complexity}
								onValueChange={(value) =>
									setComplexity(value as typeof complexity)
								}
								className="mt-2"
							>
								<View className="flex-row items-center space-x-2">
									<RadioGroupItem
										aria-labelledby="simple-label"
										value="simple"
									/>
									<Label
										nativeID="simple-label"
										className="text-sm font-normal"
									>
										Simple ({"≤"}30 minutes, basic techniques)
									</Label>
								</View>
								<View className="flex-row items-center space-x-2">
									<RadioGroupItem
										aria-labelledby="moderate-label"
										value="moderate"
									/>
									<Label
										nativeID="moderate-label"
										className="text-sm font-normal"
									>
										Moderate (30-60 minutes, intermediate skills)
									</Label>
								</View>
								<View className="flex-row items-center space-x-2">
									<RadioGroupItem
										aria-labelledby="complex-label"
										value="complex"
									/>
									<Label
										nativeID="complex-label"
										className="text-sm font-normal"
									>
										Complex ({">"}60 minutes, advanced techniques)
									</Label>
								</View>
							</RadioGroup>
						</View>

						{/* Additional Requirements */}
						<View>
							<Label nativeID="additional-requirements">
								Additional Requirements (Optional)
							</Label>
							<Textarea
								placeholder="E.g., vegetarian, gluten-free, family-friendly, etc."
								value={additionalRequirements}
								onChangeText={setAdditionalRequirements}
								className="mt-2"
								numberOfLines={3}
							/>
						</View>

						{/* Generate Button */}
						<Button
							onPress={handleGenerateRecipe}
							disabled={isGenerating}
							className="mt-6"
						>
							<Text className="text-primary-foreground font-medium">
								{isGenerating ? "Generating Recipe..." : "Generate Recipe"}
							</Text>
						</Button>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
