import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Link,
	MoreHorizontalIcon,
	MoveDownRight,
	PencilIcon,
	Plus,
	Sandwich,
	Search,
	Trash2Icon,
	WandSparkles,
} from "@/lib/icons";
import { ScrollView, View } from "react-native";
import { Stack, router } from "expo-router";

import { Button } from "@/components/ui/button";
import { DeleteRecipeDialog } from "@/components/recipe/delete-recipe-dialog";
import { Input } from "@/components/ui/input";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeCardSkeleton } from "@/components/recipe/recipe-card-skeleton";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { useDeleteRecipeMutation } from "@/hooks/recipes/use-delete-recipe-mutation";
import { useRecipes } from "@/hooks/recipes/use-recipes";
import { useState } from "react";

export default function Recipes() {
	const [searchQuery, setSearchQuery] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
	const { recipes, isLoading, isError } = useRecipes();
	const { deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();

	// Filter recipes based on search query
	const filteredRecipes =
		recipes?.filter((recipe: any) =>
			recipe.name.toLowerCase().includes(searchQuery.toLowerCase()),
		) || [];

	const handleCreateRecipe = () => {
		router.push("/recipes/create");
	};

	const handleImportRecipe = () => {
		router.push("/recipes/import");
	};

	const handleGenerateRecipe = () => {
		router.push("/recipes/generate");
	};

	const handleEditRecipe = (recipeId: string) => {
		router.push(`/recipes/${recipeId}/edit`);
	};

	const handleDeleteRecipe = (recipeId: string) => {
		setRecipeToDelete(recipeId);
		setDeleteDialogOpen(true);
	};

	const confirmDeleteRecipe = async () => {
		if (!recipeToDelete) return;

		try {
			await deleteRecipe(recipeToDelete);
			setDeleteDialogOpen(false);
			setRecipeToDelete(null);
		} catch (error) {
			console.error("Error deleting recipe:", error);
			// You could show another dialog or toast for error handling here
		}
	};

	const cancelDeleteRecipe = () => {
		setDeleteDialogOpen(false);
		setRecipeToDelete(null);
	};

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>
			<ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
				<View className="pb-4">
					<View className="relative">
						<Input
							placeholder="Search recipes"
							value={searchQuery}
							onChangeText={setSearchQuery}
							className="pl-10"
						/>
						<View className="absolute left-3 top-1/2 -translate-y-1/2">
							<Search className="text-muted-foreground" size={16} />
						</View>
					</View>
				</View>
				{!!isLoading && (
					<View className="native:flex-row native:flex-wrap native:gap-2 web:grid web:grid-cols-2 md:web:grid-cols-3 web:gap-2">
						{Array.from({ length: 6 }).map((_, index) => (
							<View key={`skeleton-${index}`} className="native:w-[48%]">
								<RecipeCardSkeleton />
							</View>
						))}
					</View>
				)}
				{!!isError && <Text>Error loading recipes.</Text>}
				{!!recipes && recipes.length === 0 && (
					<View className="flex-1 items-center justify-center py-16">
						<View className="items-center mb-8">
							<Sandwich className="text-muted-foreground mb-4" size={48} />
							<Text className="text-lg font-medium text-foreground mb-2">
								No recipes saved
							</Text>
							<View className="flex-row items-center">
								<Text className="text-base text-muted-foreground mr-2">
									Create one
								</Text>
								<MoveDownRight className="text-muted-foreground" size={16} />
							</View>
						</View>
					</View>
				)}
				{!!recipes &&
					recipes.length > 0 &&
					filteredRecipes.length === 0 &&
					searchQuery && (
						<Text>No recipes match your search for "{searchQuery}".</Text>
					)}
				{!!filteredRecipes && filteredRecipes.length > 0 && (
					<View className="native:flex-row native:flex-wrap native:gap-2 web:grid web:grid-cols-2 md:web:grid-cols-3 web:gap-2">
						{filteredRecipes.map((recipe: any) => {
							const recipeOverlay = (
								<View className="absolute top-2 right-2">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border-border/50"
												onPress={(e) => e.stopPropagation()}
											>
												<MoreHorizontalIcon
													className="text-foreground"
													size={16}
												/>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											side="bottom"
											align="end"
											className="w-32"
										>
											<DropdownMenuItem
												onPress={() => handleEditRecipe(recipe.id)}
											>
												<PencilIcon
													className="text-foreground mr-2"
													size={16}
												/>
												<Text>Edit</Text>
											</DropdownMenuItem>
											<DropdownMenuItem
												onPress={() => handleDeleteRecipe(recipe.id)}
											>
												<Trash2Icon
													className="text-destructive mr-2"
													size={16}
												/>
												<Text className="text-destructive">Delete</Text>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</View>
							);

							return (
								<View key={recipe.id} className="native:w-[48%]">
									<RecipeCard
										recipe={recipe}
										onPress={() => {
											router.push({
												pathname: "/recipes/[id]",
												params: { id: recipe.id },
											});
										}}
										overlay={recipeOverlay}
									/>
								</View>
							);
						})}
					</View>
				)}
			</ScrollView>

			{/* Delete Recipe Dialog */}
			<DeleteRecipeDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={confirmDeleteRecipe}
				onCancel={cancelDeleteRecipe}
				isDeleting={isDeleting}
			/>

			{/* Floating Action Button with Dropdown Menu */}
			<View className="absolute bottom-6 right-6">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="default"
							size="icon"
							className="w-12 h-12 rounded-full shadow-sm"
						>
							<Plus className="text-primary-foreground" size={24} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="end" className="w-64 mb-2">
						<DropdownMenuItem onPress={handleCreateRecipe}>
							<Plus className="text-foreground mr-2" size={16} />
							<Text>Create new recipe</Text>
						</DropdownMenuItem>
						<DropdownMenuItem onPress={handleGenerateRecipe}>
							<WandSparkles className="text-foreground mr-2" size={16} />
							<Text>Generate recipe</Text>
						</DropdownMenuItem>
						<DropdownMenuItem onPress={handleImportRecipe}>
							<Link className="text-foreground mr-2" size={16} />
							<Text>Import recipe from URL</Text>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</View>
		</SafeAreaView>
	);
}
