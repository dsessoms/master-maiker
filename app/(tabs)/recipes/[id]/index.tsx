import { ActivityIndicator, ScrollView, View } from "react-native";
import { ExpandedIngredient, InstructionRow } from "@/types";
import { Minus, PencilIcon, Plus } from "@/lib/icons";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { Ingredient } from "@/components/recipe/ingredient";
import { Instruction } from "@/components/recipe/instruction";
import { Macros } from "@/components/recipe/macros";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { useRecipe } from "@/hooks/recipes/use-recipe";

export default function RecipeDetails() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { recipe, isLoading, isError } = useRecipe(id!);
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
			<SafeAreaView className="flex flex-1 bg-background justify-center items-center">
				<ActivityIndicator size="large" />
				<Text className="mt-2">Loading recipe...</Text>
			</SafeAreaView>
		);
	}

	if (isError || !recipe) {
		return (
			<SafeAreaView className="flex flex-1 bg-background justify-center items-center p-4">
				<Text className="text-lg font-semibold mb-2">Recipe not found</Text>
				<Text className="text-center text-muted-foreground mb-4">
					The recipe you're looking for doesn't exist or you don't have
					permission to view it.
				</Text>
				<Button onPress={() => router.back()}>
					<Text>Go Back</Text>
				</Button>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<ScrollView className="flex-1">
				<View className="p-4">
					{/* Header Section */}
					<View className="mb-6">
						<View className="flex flex-row justify-between items-start mb-4">
							<View className="flex-1 mr-4">
								<Text className="text-2xl font-bold mb-2">{recipe.name}</Text>
								{recipe.description && (
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
								.map((ingredient: ExpandedIngredient) => (
									<Ingredient
										key={ingredient.id}
										ingredient={ingredient}
										recipeServingsMultiplier={recipeServingsMultiplier}
									/>
								))}
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
								.map((instruction: InstructionRow, index: number) => (
									<Instruction
										key={instruction.id}
										index={index}
										value={instruction.value || ""}
									/>
								))}
						</View>
					</View>

					{/* Add to Shopping List Section */}
					<View className="mb-6">
						<Button className="w-full" variant="default">
							<Plus className="h-4 w-4 mr-2" />
							<Text>Add to Shopping List</Text>
						</Button>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
