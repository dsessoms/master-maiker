import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpandedIngredient, InstructionRow } from "@/types";
import {
	Minus,
	MoreHorizontalIcon,
	PencilIcon,
	Plus,
	ShoppingCart,
	Trash2Icon,
} from "@/lib/icons";
import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { AddShoppingItemsData } from "@/components/shopping/add-shopping-items-modal/types";
import { AddShoppingItemsModal } from "@/components/shopping/add-shopping-items-modal";
import { Button } from "@/components/ui/button";
import { DeleteRecipeDialog } from "@/components/recipe/delete-recipe-dialog";
import { Header } from "@/components/recipe/header";
import { Image } from "@/components/image";
import { Ingredient } from "@/components/recipe/ingredient";
import { Instruction } from "@/components/recipe/instruction";
import { Macros } from "@/components/recipe/macros";
import { RecipeDetailsSkeleton } from "@/components/recipe/recipe-details-skeleton";
import { Text } from "@/components/ui/text";
import { useDeleteRecipeMutation } from "@/hooks/recipes/use-delete-recipe-mutation";
import { useRecipe } from "@/hooks/recipes/use-recipe";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";

export default function RecipeDetails() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { recipe, isLoading, isError } = useRecipe(id!);
	const imageUrl = useRecipeImage(recipe?.image_id);
	const { deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();
	const [recipeServings, setRecipeServings] = useState<number>(1);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [showAddToShoppingListModal, setShowAddToShoppingListModal] =
		useState(false);

	useEffect(() => {
		if (recipe) {
			setRecipeServings(recipe.number_of_servings);
		}
	}, [recipe]);

	const recipeServingsMultiplier =
		recipeServings / (recipe?.number_of_servings || 1);

	// Prepare data for shopping list modal
	const shoppingItemsData: AddShoppingItemsData = useMemo(() => {
		if (!recipe) return { recipes: [] };
		return {
			recipes: [
				{
					recipeId: recipe.id,
					numberOfServings: recipeServings,
				},
			],
		};
	}, [recipe?.id, recipeServings]);

	const addRecipeServing = () => {
		setRecipeServings((servings) => servings + 1);
	};

	const removeRecipeServing = () => {
		if (recipeServings === 1) {
			return;
		}
		setRecipeServings((servings) => servings - 1);
	};

	const handleEditRecipe = () => {
		if (!recipe) return;
		router.push({
			pathname: "/recipes/[id]/edit",
			params: { id: recipe.id },
		});
	};

	const handleDeleteRecipe = () => {
		setDeleteDialogOpen(true);
	};

	const handleAddToShoppingList = () => {
		setShowAddToShoppingListModal(true);
	};

	const confirmDeleteRecipe = async () => {
		if (!id) return;

		try {
			await deleteRecipe(id);
			setDeleteDialogOpen(false);
			router.back();
		} catch (error) {
			console.error("Error deleting recipe:", error);
			// You could show another dialog or toast for error handling here
		}
	};

	const cancelDeleteRecipe = () => {
		setDeleteDialogOpen(false);
	};

	if (isLoading) {
		return (
			<View className="flex flex-1 bg-background">
				<Stack.Screen
					options={{
						title: "Recipe",
					}}
				/>
				<ScrollView className="flex-1">
					<RecipeDetailsSkeleton />
				</ScrollView>
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
			<Stack.Screen
				options={{
					title: recipe.name,
				}}
			/>
			<ScrollView className="flex-1">
				<View className="p-4">
					{/* Recipe Image */}
					<View className="mb-6 relative">
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
						{/* Dropdown Menu over Image */}
						<View className="absolute top-2 right-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border-border/50"
									>
										<MoreHorizontalIcon className="text-foreground" size={16} />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent side="bottom" align="end" className="w-32">
									<DropdownMenuItem onPress={handleEditRecipe}>
										<PencilIcon className="text-foreground mr-2" size={16} />
										<Text>Edit</Text>
									</DropdownMenuItem>
									<DropdownMenuItem onPress={handleAddToShoppingList}>
										<ShoppingCart className="text-foreground mr-2" size={16} />
										<Text>Add to List</Text>
									</DropdownMenuItem>
									<DropdownMenuItem onPress={handleDeleteRecipe}>
										<Trash2Icon className="text-destructive mr-2" size={16} />
										<Text className="text-destructive">Delete</Text>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</View>
					</View>

					{/* Header Section */}
					<View className="mb-6">
						{/* Recipe Title and Description */}
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

			{/* Delete Recipe Dialog */}
			<DeleteRecipeDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={confirmDeleteRecipe}
				onCancel={cancelDeleteRecipe}
				isDeleting={isDeleting}
			/>

			{/* Add to Shopping List Modal */}
			<AddShoppingItemsModal
				isOpen={showAddToShoppingListModal}
				onClose={() => setShowAddToShoppingListModal(false)}
				itemsToAdd={shoppingItemsData}
			/>
		</View>
	);
}
