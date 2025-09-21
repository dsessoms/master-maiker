import { ActivityIndicator, ScrollView, View } from "react-native";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, Plus, Search } from "@/lib/icons";

import { Button } from "@/components/ui/button";
import { DeleteRecipeDialog } from "@/components/recipe/delete-recipe-dialog";
import { Input } from "@/components/ui/input";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeCardSkeleton } from "@/components/recipe/recipe-card-skeleton";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { useDeleteRecipeMutation } from "@/hooks/recipes/use-delete-recipe-mutation";
import { useRecipes } from "@/hooks/recipes/use-recipes";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { useState } from "react";

export default function Recipes() {
	const [searchQuery, setSearchQuery] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
	const { recipes, isLoading, isError } = useRecipes();
	const { deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();
	const { columns, cardWidth } = useResponsiveColumns();

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
					<View className="flex flex-row flex-wrap gap-2">
						{Array.from({ length: 6 }).map((_, index) => (
							<View
								key={`skeleton-${index}`}
								style={{
									width: cardWidth,
								}}
							>
								<RecipeCardSkeleton />
							</View>
						))}
					</View>
				)}
				{!!isError && <Text>Error loading recipes.</Text>}
				{!!recipes && recipes.length === 0 && <Text>No recipes found.</Text>}
				{!!recipes &&
					recipes.length > 0 &&
					filteredRecipes.length === 0 &&
					searchQuery && (
						<Text>No recipes match your search for "{searchQuery}".</Text>
					)}
				{!!filteredRecipes && filteredRecipes.length > 0 && (
					<View className="flex flex-row flex-wrap gap-2">
						{filteredRecipes.map((recipe: any) => (
							<View
								key={recipe.id}
								style={{
									width: cardWidth,
								}}
							>
								<RecipeCard
									recipe={recipe}
									onEdit={() => handleEditRecipe(recipe.id)}
									onDelete={() => handleDeleteRecipe(recipe.id)}
								/>
							</View>
						))}
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
