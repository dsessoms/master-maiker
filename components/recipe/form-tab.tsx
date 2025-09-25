import { Pressable, View } from "react-native";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { X } from "@/lib/icons";

interface IngredientChip {
	id: string;
	name: string;
}

interface FormTabProps {
	onGenerate: (options: any) => Promise<void>;
	isGenerating: boolean;
}

export const FormTab = ({ onGenerate, isGenerating }: FormTabProps) => {
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

	const handleGenerate = () => {
		const options = {
			ingredientsToInclude: ingredientsToInclude.map((ing) => ing.name),
			ingredientsToExclude: ingredientsToExclude.map((ing) => ing.name),
			complexity,
			additionalRequirements: additionalRequirements.trim() || undefined,
		};
		onGenerate(options);
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
		<View className="gap-6">
			{/* Include Ingredients */}
			<View className="gap-3">
				<Label nativeID="include-ingredients">Ingredients to Include</Label>
				<Input
					placeholder="Type an ingredient and press Enter"
					value={includeInput}
					onChangeText={setIncludeInput}
					onSubmitEditing={addIngredientToInclude}
					returnKeyType="done"
				/>
				<IngredientChips
					ingredients={ingredientsToInclude}
					onRemove={removeIngredientToInclude}
				/>
			</View>

			{/* Exclude Ingredients */}
			<View className="gap-3">
				<Label nativeID="exclude-ingredients">Ingredients to Exclude</Label>
				<Input
					placeholder="Type an ingredient and press Enter"
					value={excludeInput}
					onChangeText={setExcludeInput}
					onSubmitEditing={addIngredientToExclude}
					returnKeyType="done"
				/>
				<IngredientChips
					ingredients={ingredientsToExclude}
					onRemove={removeIngredientToExclude}
				/>
			</View>

			{/* Complexity */}
			<View className="gap-3">
				<Label nativeID="complexity">Complexity Level</Label>
				<RadioGroup
					value={complexity}
					onValueChange={(value) => setComplexity(value as typeof complexity)}
				>
					<View className="flex-row items-center gap-2">
						<RadioGroupItem aria-labelledby="simple-label" value="simple" />
						<Label nativeID="simple-label" className="flex-1">
							Simple ({"≤"}30 minutes, basic techniques)
						</Label>
					</View>
					<View className="flex-row items-center gap-2">
						<RadioGroupItem aria-labelledby="moderate-label" value="moderate" />
						<Label nativeID="moderate-label" className="flex-1">
							Moderate (30-60 minutes, intermediate skills)
						</Label>
					</View>
					<View className="flex-row items-center gap-2">
						<RadioGroupItem aria-labelledby="complex-label" value="complex" />
						<Label nativeID="complex-label" className="flex-1">
							Complex ({">"}60 minutes, advanced techniques)
						</Label>
					</View>
				</RadioGroup>
			</View>

			{/* Additional Requirements */}
			<View className="gap-3">
				<Label nativeID="additional-requirements">
					Additional Requirements (Optional)
				</Label>
				<Textarea
					placeholder="E.g., vegetarian, gluten-free, family-friendly, etc."
					value={additionalRequirements}
					onChangeText={setAdditionalRequirements}
					numberOfLines={3}
				/>
			</View>

			{/* Generate Button */}
			<Button onPress={handleGenerate} disabled={isGenerating}>
				<Text>{isGenerating ? "Generating Recipe..." : "Generate Recipe"}</Text>
			</Button>
		</View>
	);
};
