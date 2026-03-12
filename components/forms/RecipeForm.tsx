import Animated, { useAnimatedRef } from "react-native-reanimated";
import { Form, FormField, FormInput, FormTextarea } from "../ui/form";
import { Ingredient, Recipe, RecipeSchema } from "../../lib/schemas";
import {
	useCuisines,
	useDiets,
	useDishTypes,
	useTags,
} from "@/hooks/recipes/use-classifications";

import { Button } from "../ui/button";
import { ClassificationPills } from "./classifications/ClassificationPills";
import { ImageUploader } from "./ImageUploader";
import { IngredientInputs } from "./ingredients/IngredientInputs";
import { InstructionInputs } from "./instructions/InstructionInputs";
import { InstructionOrHeader } from "@/components/forms/instructions/InstructionInput";
import { Label } from "../ui/label";
import { Link } from "@/lib/icons";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { TagPills } from "./classifications/TagPills";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { supabase } from "@/config/supabase";
import { useForm } from "react-hook-form";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { zodResolver } from "@hookform/resolvers/zod";

// Header type definition to match schema
interface Header {
	type: "header";
	name: string;
}

// Union type for ingredients or headers
type IngredientOrHeader = Ingredient | Header;

export interface RecipeFormProps {
	initialValues?: Recipe;
	onSubmit: (data: Partial<Recipe>) => Promise<void>;
	isEdit?: boolean;
}

export function RecipeForm({
	initialValues,
	onSubmit,
	isEdit,
}: RecipeFormProps) {
	const existingImageUrl = useRecipeImage(initialValues?.image_id);
	const scrollableRef = useAnimatedRef<Animated.ScrollView>();

	// Fetch classification data
	const { data: cuisines, isLoading: cuisinesLoading } = useCuisines();
	const { data: diets, isLoading: dietsLoading } = useDiets();
	const { data: dishTypes, isLoading: dishTypesLoading } = useDishTypes();
	const { data: tags, isLoading: tagsLoading } = useTags();

	const form = useForm<Recipe>({
		resolver: zodResolver(RecipeSchema),
		defaultValues: initialValues ?? {
			name: "",
			description: "",
			servings: 1,
			ingredients: [],
			instructions: [],
			prep_time_hours: 0,
			prep_time_minutes: 0,
			cook_time_hours: 0,
			cook_time_minutes: 0,
			source_url: "",
			cuisine_ids: [],
			diet_ids: [],
			dish_type_ids: [],
			tag_names: [],
		},
	});

	const [parsedIngredients, setParsedIngredients] = useState<
		IngredientOrHeader[]
	>([]);
	const [parsedInstructions, setParsedInstructions] = useState<
		InstructionOrHeader[]
	>([]);
	const [selectedImage, setSelectedImage] = useState<
		{ file: File; uri: string } | string | undefined
	>(existingImageUrl);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [showSourceUrl, setShowSourceUrl] = useState(
		!!initialValues?.source_url,
	);

	// Override the submit handler to include parsed ingredients and handle image upload
	const handleSubmit = async (data: Partial<Recipe>) => {
		let image_id: string | undefined;

		// Handle image upload if there's a new file
		if (
			selectedImage &&
			typeof selectedImage === "object" &&
			"file" in selectedImage
		) {
			setIsUploadingImage(true);
			try {
				const newImageUUID = uuidv4();
				const { error: uploadError } = await supabase.storage
					.from("recipe-photos")
					.upload(newImageUUID, selectedImage.file);

				if (uploadError) {
					console.error("Image upload error:", uploadError);
					throw new Error("Failed to upload image");
				}

				image_id = newImageUUID;
			} catch (error) {
				console.error("Error uploading image:", error);
				// Continue without image if upload fails
			} finally {
				setIsUploadingImage(false);
			}
		} else if (
			typeof selectedImage === "string" &&
			selectedImage === existingImageUrl
		) {
			// Keep existing image ID if the selected image is the same as the existing one
			image_id = initialValues?.image_id;
		} else if (typeof selectedImage === "string") {
			// This is a new URL that's not the existing one, treat as new image ID
			image_id = selectedImage;
		}

		await onSubmit({
			...data,
			instructions: parsedInstructions,
			ingredients: parsedIngredients,
			image_id: image_id,
		});
	};

	return (
		<Animated.ScrollView
			contentContainerStyle={{ flexGrow: 1 }}
			keyboardShouldPersistTaps="handled"
			ref={scrollableRef}
		>
			<View className="flex flex-1">
				<View className="p-4 w-full max-w-3xl mx-auto">
					<Form {...form}>
						<View className="gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormInput
										label="Recipe Name"
										labelClassName="text-xl font-semibold"
										placeholder="Recipe Name"
										autoCapitalize="none"
										autoCorrect={false}
										{...field}
									/>
								)}
							/>

							<View>
								<Label className="text-xl font-semibold mb-2">Photo</Label>
								<ImageUploader
									selectedImageUri={
										typeof selectedImage === "string"
											? selectedImage
											: selectedImage?.uri
									}
									onImageSelected={setSelectedImage}
								/>
							</View>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormTextarea
										label="Description"
										labelClassName="text-xl font-semibold"
										placeholder="A brief description of the recipe"
										autoCapitalize="none"
										autoCorrect={false}
										{...field}
									/>
								)}
							/>
							{!showSourceUrl ? (
								<Button
									variant="outline"
									size="sm"
									onPress={() => setShowSourceUrl(true)}
									className="mb-2 flex-row gap-2 self-start"
								>
									<Link className="h-4 w-4" />
									<Text>Add Source URL</Text>
								</Button>
							) : (
								<FormField
									control={form.control}
									name="source_url"
									render={({ field }) => (
										<FormInput
											label="Source URL (Optional)"
											labelClassName="text-xl font-semibold"
											placeholder="https://example.com/recipe"
											autoCapitalize="none"
											autoCorrect={false}
											keyboardType="url"
											{...field}
											value={field.value ?? ""}
										/>
									)}
								/>
							)}
							<FormField
								control={form.control}
								name="servings"
								render={({ field }) => (
									<FormInput
										label="Servings"
										labelClassName="text-xl font-semibold"
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

							<Label className="text-xl font-semibold">Ingredients</Label>
							<IngredientInputs
								onIngredientsChange={setParsedIngredients}
								recipeServings={form.watch("servings") || 1}
								initialValues={initialValues?.ingredients}
								scrollableRef={scrollableRef}
							/>
							<Label className="text-xl font-semibold">Instructions</Label>
							<InstructionInputs
								onInstructionsChange={setParsedInstructions}
								initialValues={initialValues?.instructions}
								scrollableRef={scrollableRef}
							/>
							{/* Prep Time Section */}
							<Label className="text-xl font-semibold">Prep Time</Label>
							<View className="flex-row gap-3">
								<View className="flex-1">
									<FormField
										control={form.control}
										name="prep_time_hours"
										render={({ field }) => (
											<FormInput
												label="Hours"
												placeholder="0"
												keyboardType="numeric"
												{...field}
												value={field.value?.toString() ?? ""}
												onChangeText={(v) =>
													field.onChange(v === "" ? 0 : Number(v))
												}
											/>
										)}
									/>
								</View>
								<View className="flex-1">
									<FormField
										control={form.control}
										name="prep_time_minutes"
										render={({ field }) => (
											<FormInput
												label="Minutes"
												placeholder="0"
												keyboardType="numeric"
												{...field}
												value={field.value?.toString() ?? ""}
												onChangeText={(v) =>
													field.onChange(v === "" ? 0 : Number(v))
												}
											/>
										)}
									/>
								</View>
							</View>
							{/* Cook Time Section */}
							<Label className="text-xl font-semibold">Cook Time</Label>
							<View className="flex-row gap-3">
								<View className="flex-1">
									<FormField
										control={form.control}
										name="cook_time_hours"
										render={({ field }) => (
											<FormInput
												label="Hours"
												placeholder="0"
												keyboardType="numeric"
												{...field}
												value={field.value?.toString() ?? ""}
												onChangeText={(v) =>
													field.onChange(v === "" ? 0 : Number(v))
												}
											/>
										)}
									/>
								</View>
								<View className="flex-1">
									<FormField
										control={form.control}
										name="cook_time_minutes"
										render={({ field }) => (
											<FormInput
												label="Minutes"
												placeholder="0"
												keyboardType="numeric"
												{...field}
												value={field.value?.toString() ?? ""}
												onChangeText={(v) =>
													field.onChange(v === "" ? 0 : Number(v))
												}
											/>
										)}
									/>
								</View>
							</View>

							{/* Classification Fields */}
							<FormField
								control={form.control}
								name="cuisine_ids"
								render={({ field }) => (
									<ClassificationPills
										label="Cuisines"
										items={cuisines ?? []}
										selectedIds={field.value ?? []}
										onSelectionChange={field.onChange}
										isLoading={cuisinesLoading}
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="diet_ids"
								render={({ field }) => (
									<ClassificationPills
										label="Diets"
										items={diets ?? []}
										selectedIds={field.value ?? []}
										onSelectionChange={field.onChange}
										isLoading={dietsLoading}
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="dish_type_ids"
								render={({ field }) => (
									<ClassificationPills
										label="Dish Types"
										items={dishTypes ?? []}
										selectedIds={field.value ?? []}
										onSelectionChange={field.onChange}
										isLoading={dishTypesLoading}
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="tag_names"
								render={({ field }) => (
									<TagPills
										label="Tags"
										existingTags={tags ?? []}
										selectedTagNames={field.value ?? []}
										onSelectionChange={field.onChange}
										isLoading={tagsLoading}
									/>
								)}
							/>
						</View>
					</Form>
					<Button
						size="default"
						variant="default"
						onPress={form.handleSubmit(handleSubmit, (formErrors) => {
							console.error("Form submission errors:", formErrors);
						})}
						disabled={form.formState.isSubmitting || isUploadingImage}
						className="my-4 flex-row gap-2"
					>
						{form.formState.isSubmitting ||
							(isUploadingImage && <LoadingIndicator />)}
						<Text>{isEdit ? "Save Changes" : "Create Recipe"}</Text>
					</Button>
				</View>
			</View>
		</Animated.ScrollView>
	);
}
