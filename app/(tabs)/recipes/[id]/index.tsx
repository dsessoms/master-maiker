import { ActivityIndicator, ScrollView, View } from "react-native";
import { ExpandedIngredient, InstructionRow } from "@/types";
import { Minus, PencilIcon, Plus } from "@/lib/icons";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/recipe/header";
import { Image } from "@/components/image";
import { Ingredient } from "@/components/recipe/ingredient";
import { Instruction } from "@/components/recipe/instruction";
import { Macros } from "@/components/recipe/macros";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { useRecipe } from "@/hooks/recipes/use-recipe";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";

export default function RecipeDetails() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { recipe, isLoading, isError } = useRecipe(id!);
	const imageUrl = useRecipeImage(recipe?.image_id);
	const [recipeServings, setRecipeServings] = useState<number>(1);

	useEffect(() => {
		if (recipe) {
			setRecipeServings(recipe.number_of_servings);
		}
	}, [recipe]);

	const recipeServingsMultiplier =
		recipeServings / (recipe?.number_of_servings || 1);

	const addRecipeServing = () => {
		setRecipeServings((servings) => servings + 1);
	};

	const removeRecipeServing = () => {
		if (recipeServings === 1) {
			return;
		}
		setRecipeServings((servings) => servings - 1);
	};

	if (isLoading) {
		return (
			<View className="flex flex-1 bg-background justify-center items-center">
				<ActivityIndicator size="large" />
				<Text className="mt-2">Loading recipe...</Text>
			</View>
		);
	}

	if (isError || !recipe) {
		return (
			<View className="flex flex-1 bg-background justify-center items-center p-4">
				<Text className="text-lg font-semibold mb-2">Recipe not found</Text>
				<Text className="text-center text-muted-foreground mb-4">
					The recipe you're looking for doesn't exist or you don't have
					permission to view it.
				</Text>
				<Button onPress={() => router.back()}>
					<Text>Go Back</Text>
				</Button>
			</View>
		);
	}

	return (
		<View className="flex flex-1 bg-background">
			<ScrollView className="flex-1">
				<View className="p-4">
					{/* Recipe Image */}
					{imageUrl && (
						<View className="mb-6">
							<Image
								source={{ uri: imageUrl }}
								className="h-64 w-full rounded-lg"
								contentFit="cover"
							/>
						</View>
					)}

					{/* Header Section */}
					<View className="mb-6">
						<View className="flex flex-row justify-between items-start mb-4">
							<View className="flex-1 mr-4">
								<Text className="text-2xl font-bold mb-2">{recipe.name}</Text>
								{!!recipe.description && (
									<Text className="text-base text-muted-foreground">
										{recipe.description}
									</Text>
								)}
							</View>
							<Button
								size="icon"
								variant="outline"
								onPress={() => {
									router.push({
										pathname: "/recipes/[id]/edit",
										params: { id: recipe.id },
									});
								}}
							>
								<PencilIcon className="h-5 w-5" />
							</Button>
						</View>
					</View>

					{/* Ingredients Section */}
					<View className="mb-6">
						<View className="flex flex-row justify-between items-center mb-4">
							<Text className="text-xl font-semibold">Ingredients</Text>
							<View className="flex flex-row items-center gap-2">
								<Button
									size="icon"
									variant="outline"
									onPress={removeRecipeServing}
									disabled={recipeServings === 1}
								>
									<Minus className="h-4 w-4" />
								</Button>
								<Text className="text-base font-medium min-w-[80px] text-center">
									{recipeServings} serving{recipeServings !== 1 ? "s" : ""}
								</Text>
								<Button
									size="icon"
									variant="outline"
									onPress={addRecipeServing}
								>
									<Plus className="h-4 w-4" />
								</Button>
							</View>
						</View>
						<View className="space-y-2">
							{recipe.ingredient
								.sort(
									(a: ExpandedIngredient, b: ExpandedIngredient) =>
										a.order - b.order,
								)
								.map((ingredient: ExpandedIngredient) => {
									// Check if this is a header
									if (ingredient.type === "header") {
										return (
											<Header
												key={ingredient.id}
												name={ingredient.name || ""}
											/>
										);
									}

									// Render regular ingredient
									return (
										<Ingredient
											key={ingredient.id}
											ingredient={ingredient}
											recipeServingsMultiplier={recipeServingsMultiplier}
										/>
									);
								})}
						</View>
					</View>

					{/* Nutrition Section */}
					<View className="mb-6">
						<Macros recipe={recipe} />
					</View>

					{/* Instructions Section */}
					<View className="mb-6">
						<Text className="text-xl font-semibold mb-4">Instructions</Text>
						<View>
							{recipe.instruction
								?.sort(
									(a: InstructionRow, b: InstructionRow) => a.order - b.order,
								)
								.map((instruction: InstructionRow, index: number) => {
									// Check if this is a header
									if (instruction.type === "header") {
										return (
											<Header
												key={instruction.id}
												name={instruction.name || ""}
											/>
										);
									}

									// Calculate the step number by counting only non-header instructions before this one
									const sortedInstructions =
										recipe.instruction?.sort(
											(a: InstructionRow, b: InstructionRow) =>
												a.order - b.order,
										) || [];

									const stepNumber = sortedInstructions
										.slice(0, index)
										.filter((inst) => inst.type !== "header").length;

									return (
										<Instruction
											key={instruction.id}
											index={stepNumber}
											value={instruction.value || ""}
										/>
									);
								})}
						</View>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
