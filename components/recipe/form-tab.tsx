import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChipsInput } from "@/components/ui/chips-input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { View } from "react-native";

interface FormTabProps {
	onGenerate: (options: any) => Promise<void>;
	isGenerating: boolean;
}

export const FormTab = ({ onGenerate, isGenerating }: FormTabProps) => {
	const [ingredientsToInclude, setIngredientsToInclude] = useState<string[]>(
		[],
	);
	const [ingredientsToExclude, setIngredientsToExclude] = useState<string[]>(
		[],
	);
	const [complexity, setComplexity] = useState<
		"simple" | "moderate" | "complex"
	>("moderate");
	const [additionalRequirements, setAdditionalRequirements] = useState("");

	const handleGenerate = () => {
		const options = {
			ingredientsToInclude,
			ingredientsToExclude,
			complexity,
			additionalRequirements: additionalRequirements.trim() || undefined,
		};
		onGenerate(options);
	};

	return (
		<View className="gap-6">
			{/* Include Ingredients */}
			<ChipsInput
				label="Ingredients to Include"
				placeholder="Type an ingredient and press Enter"
				chips={ingredientsToInclude}
				onChipsChange={setIngredientsToInclude}
				disabled={isGenerating}
			/>

			{/* Exclude Ingredients */}
			<ChipsInput
				label="Ingredients to Exclude"
				placeholder="Type an ingredient and press Enter"
				chips={ingredientsToExclude}
				onChipsChange={setIngredientsToExclude}
				disabled={isGenerating}
			/>

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
