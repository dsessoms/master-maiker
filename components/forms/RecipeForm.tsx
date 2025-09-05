import * as z from "zod";

import { ActivityIndicator, View } from "react-native";
import { Form, FormField, FormInput, FormTextarea } from "../ui/form";
import { Ingredient, Instruction, RecipeSchema } from "../../lib/schemas";

import { Button } from "../ui/button";
import { IngredientInputs } from "./IngredientInputs";
import { InstructionInputs } from "./InstructionInputs";
import { Label } from "../ui/label";
import { PostRecipesRequest } from "../../app/api/recipes/index+api";
import { Text } from "@/components/ui/text";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

const LocalRecipeSchema = RecipeSchema.extend({
	userId: RecipeSchema.shape.userId.optional(),
	createdAt: RecipeSchema.shape.createdAt.optional(),
	updatedAt: RecipeSchema.shape.updatedAt.optional(),
	id: RecipeSchema.shape.id.optional(),
});

type LocalRecipe = z.infer<typeof LocalRecipeSchema>;

export interface RecipeFormProps {
	initialValues?: LocalRecipe;
	onSubmit: (data: Partial<PostRecipesRequest>) => Promise<void>;
	isEdit?: boolean;
}

export function RecipeForm({
	initialValues,
	onSubmit,
	isEdit,
}: RecipeFormProps) {
	const form = useForm<LocalRecipe>({
		resolver: zodResolver(LocalRecipeSchema),
		defaultValues: initialValues ?? {
			name: "",
			description: "",
			servings: 1,
			ingredients: [],
			instructions: [],
			prepTimeHours: 0,
			prepTimeMinutes: 0,
			cookTimeHours: 0,
			cookTimeMinutes: 0,
		},
	});

	const [parsedIngredients, setParsedIngredients] = useState<Ingredient[]>([]);
	const [parsedInstructions, setParsedInstructions] = useState<string[]>([]);

	// Override the submit handler to include parsed ingredients
	const handleSubmit = async (data: Partial<LocalRecipe>) => {
		const instructions: Instruction[] = parsedInstructions.map((value) => ({
			type: "instruction",
			value,
		}));

		const recipeData = {
			name: data.name,
			number_of_servings: data.servings,
			description: data.description,
			instructions: instructions.map((ins) => ins.value),
			ingredients: [], // TODO: add ingredients
			prep_time_hours: data.prepTimeHours,
			prep_time_minutes: data.prepTimeMinutes,
			cook_time_hours: data.cookTimeHours,
			cook_time_minutes: data.cookTimeMinutes,
			image_id: data.imageUrl,
		};

		await onSubmit(recipeData);
	};

	return (
		<View style={{ padding: 16 }}>
			<Form {...form}>
				<View className="gap-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormInput
								label="Recipe Name"
								placeholder="Recipe Name"
								autoCapitalize="none"
								autoCorrect={false}
								{...field}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormTextarea
								label="Description"
								placeholder="A brief description of the recipe"
								autoCapitalize="none"
								autoCorrect={false}
								{...field}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="servings"
						render={({ field }) => (
							<FormInput
								label="Servings"
								placeholder="Number of servings"
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="numeric"
								{...field}
								value={field.value?.toString() ?? ""}
								onChangeText={(v) =>
									field.onChange(v === "" ? null : Number(v))
								}
							/>
						)}
					/>
					<Label>Ingredients</Label>
					<IngredientInputs
						onIngredientsChange={setParsedIngredients}
						initialValues={
							initialValues?.ingredients?.filter(
								(i: any) => i.type === "ingredient",
							) as Ingredient[]
						}
					/>
					<Label>Instructions</Label>
					<InstructionInputs
						onInstructionsChange={setParsedInstructions}
						initialValues={initialValues?.instructions
							?.filter((i: any) => i.type === "instruction")
							.map((i: any) => i.value)}
					/>
					{/* Prep Time Section */}
					<Label>Prep Time</Label>
					<View style={{ flexDirection: "row", gap: 12 }}>
						<FormField
							control={form.control}
							name="prepTimeHours"
							render={({ field }) => (
								<FormInput
									label="Hours"
									placeholder="0"
									keyboardType="numeric"
									style={{ flex: 1 }}
									{...field}
									value={field.value?.toString() ?? ""}
									onChangeText={(v) => field.onChange(v === "" ? 0 : Number(v))}
								/>
							)}
						/>
						<FormField
							control={form.control}
							name="prepTimeMinutes"
							render={({ field }) => (
								<FormInput
									label="Minutes"
									placeholder="0"
									keyboardType="numeric"
									style={{ flex: 1 }}
									{...field}
									value={field.value?.toString() ?? ""}
									onChangeText={(v) => field.onChange(v === "" ? 0 : Number(v))}
								/>
							)}
						/>
					</View>
					{/* Cook Time Section */}
					<Label>Cook Time</Label>
					<View style={{ flexDirection: "row", gap: 12 }}>
						<FormField
							control={form.control}
							name="cookTimeHours"
							render={({ field }) => (
								<FormInput
									label="Hours"
									placeholder="0"
									keyboardType="numeric"
									style={{ flex: 1 }}
									{...field}
									value={field.value?.toString() ?? ""}
									onChangeText={(v) => field.onChange(v === "" ? 0 : Number(v))}
								/>
							)}
						/>
						<FormField
							control={form.control}
							name="cookTimeMinutes"
							render={({ field }) => (
								<FormInput
									label="Minutes"
									placeholder="0"
									keyboardType="numeric"
									style={{ flex: 1 }}
									{...field}
									value={field.value?.toString() ?? ""}
									onChangeText={(v) => field.onChange(v === "" ? 0 : Number(v))}
								/>
							)}
						/>
					</View>
				</View>
			</Form>
			<Button
				size="default"
				variant="default"
				onPress={form.handleSubmit(handleSubmit, (formErrors) => {
					console.error("Form submission errors:", formErrors);
				})}
				disabled={form.formState.isSubmitting}
				className="web:m-4"
			>
				{form.formState.isSubmitting ? (
					<ActivityIndicator size="small" />
				) : (
					<Text>{isEdit ? "Save Changes" : "Create Recipe"}</Text>
				)}
			</Button>
		</View>
	);
}
