import { Link, Minus, Plus } from "@/lib/icons";
import { Linking, ScrollView, View } from "react-native";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ExpandedRecipe } from "@/types";
import { Header } from "@/components/recipe/header";
import { Image } from "@/components/image";
import { Ingredient } from "@/components/recipe/ingredient";
import { Instruction } from "@/components/recipe/instruction";
import { Macros } from "@/components/recipe/macros";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * Safely extracts the domain name from a URL string
 * @param url - The URL to parse
 * @returns The domain name without 'www.' prefix, or 'View Recipe' as fallback
 */
function getDomainFromUrl(url: string): string {
	try {
		const hostname = new URL(url).hostname;
		return hostname.replace(/^www\./, "");
	} catch {
		return "View Recipe";
	}
}

interface RecipeDetailsContentProps {
	recipe: ExpandedRecipe;
	imageUrl?: string;
	headerActions?: React.ReactNode;
	topActions?: React.ReactNode;
	onServingsChange?: (servings: number) => void;
}

export function RecipeDetailsContent({
	recipe,
	imageUrl,
	headerActions,
	topActions,
	onServingsChange,
}: RecipeDetailsContentProps) {
	const [recipeServings, setRecipeServings] = useState<number>(
		recipe.number_of_servings,
	);

	useEffect(() => {
		setRecipeServings(recipe.number_of_servings);
	}, [recipe.number_of_servings]);

	useEffect(() => {
		onServingsChange?.(recipeServings);
	}, [recipeServings, onServingsChange]);

	const recipeServingsMultiplier =
		recipeServings / (recipe.number_of_servings || 1);

	const addRecipeServing = () => {
		setRecipeServings((servings) => servings + 1);
	};

	const removeRecipeServing = () => {
		if (recipeServings === 1) return;
		setRecipeServings((servings) => servings - 1);
	};

	return (
		<ScrollView className="flex-1">
			<View className="p-4 w-full max-w-3xl mx-auto">
				{/* Recipe Image */}
				<View
					className={cn({ "mb-6 relative": true, "mb-2": recipe.source_url })}
				>
					{!!imageUrl ? (
						<Image
							source={{ uri: imageUrl }}
							className="h-64 w-full rounded-lg"
							contentFit="cover"
						/>
					) : (
						<View className="h-64 w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
							<Text className="text-6xl font-bold text-muted-foreground opacity-20">
								{recipe.name.toUpperCase()}
							</Text>
						</View>
					)}
					{!!recipe.source_url && (
						<Button
							onPress={() => Linking.openURL(recipe.source_url!)}
							variant="link"
							className="flex-row gap-2 self-start p-0"
						>
							<Link className="h-4 w-4" />
							<Text className="text-muted-foreground">
								{getDomainFromUrl(recipe.source_url)}
							</Text>
						</Button>
					)}
					{headerActions && (
						<View className="absolute top-2 right-2">{headerActions}</View>
					)}
				</View>

				{/* Top Actions (Save/Sign Up buttons) */}
				{topActions && <View className="mb-6">{topActions}</View>}

				{/* Header Section */}
				<View className="mb-6">
					<View>
						<Text className="text-2xl font-bold mb-2">{recipe.name}</Text>
						{!!recipe.description && (
							<Text className="text-base text-muted-foreground">
								{recipe.description}
							</Text>
						)}
					</View>
				</View>

				{/* Nutrition Section */}
				<View className="mb-6">
					<Macros recipe={recipe} />
				</View>

				{/* Ingredients Section */}
				<View className="mb-6">
					<View className="flex flex-row justify-between items-center mb-4">
						<Text className="text-xl font-semibold">Ingredients</Text>
						<View className="flex flex-row items-center gap-2">
							<Button
								size="icon"
								variant="outline"
								className="rounded-full"
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
								className="rounded-full"
								onPress={addRecipeServing}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</View>
					</View>
					<View className="space-y-2">
						{recipe.ingredient
							?.sort((a, b) => a.order - b.order)
							.map((ingredient) => {
								if (ingredient.type === "header") {
									return (
										<Header key={ingredient.id} name={ingredient.name || ""} />
									);
								}

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

				{/* Instructions Section */}
				<View className="mb-6">
					<Text className="text-xl font-semibold mb-4">Instructions</Text>
					<View className="space-y-4">
						{recipe.instruction
							?.sort((a, b) => a.order - b.order)
							.map((instruction, index) => {
								if (instruction.type === "header") {
									return (
										<Header
											key={instruction.id}
											name={instruction.name || ""}
										/>
									);
								}

								const sortedInstructions =
									recipe.instruction?.sort((a, b) => a.order - b.order) || [];

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

				{/* Tags Section */}
				{recipe.recipe_tags && recipe.recipe_tags.length > 0 && (
					<View className="mb-6">
						<Text className="text-xl font-semibold mb-4">Tags</Text>
						<View className="flex-row flex-wrap gap-2">
							{recipe.recipe_tags
								.filter((rt) => rt.tags?.name)
								.map((rt, index) => (
									<View
										key={index}
										className="bg-muted flex-row items-center gap-1 rounded-md px-2 py-1"
									>
										<Text className="text-sm text-secondary-foreground">
											{rt.tags!.name}
										</Text>
									</View>
								))}
						</View>
					</View>
				)}
			</View>
		</ScrollView>
	);
}
