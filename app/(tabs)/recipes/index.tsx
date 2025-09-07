import { Link, Plus } from "@/lib/icons";
import { router } from "expo-router";

import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { useRecipes } from "@/hooks/recipes/use-recipes";
import { useDeleteRecipeMutation } from "@/hooks/recipes/use-delete-recipe-mutation";
import { ScrollView } from "react-native";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Recipes() {
	const { recipes, isLoading, isError } = useRecipes();
	const { deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();
	const { columns, cardWidth } = useResponsiveColumns();
	const { showDialog } = useConfirmDialog();

	const handleCreateRecipe = () => {
		router.push("/recipes/create");
	};

	const handleImportRecipe = () => {
		// TODO: Implement import from URL functionality
		console.log("Import recipe from URL");
	};

	const handleEditRecipe = (recipeId: string) => {
		router.push(`/recipes/${recipeId}/edit`);
	};

	const handleDeleteRecipe = (recipeId: string) => {
		showDialog({
			title: "Delete Recipe",
			message:
				"Are you sure you want to delete this recipe? This action cannot be undone.",
			confirmText: "Delete",
			cancelText: "Cancel",
			onConfirm: async () => {
				try {
					await deleteRecipe(recipeId);
				} catch (error) {
					console.error("Error deleting recipe:", error);
					showDialog({
						title: "Error",
						message: "Failed to delete recipe. Please try again.",
						confirmText: "OK",
						onConfirm: () => {},
					});
				}
			},
		});
	};

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			{/* Main content */}
			<ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
				{isLoading && <Text>Loading...</Text>}
				{isError && <Text>Error loading recipes.</Text>}
				{recipes && recipes.length === 0 && <Text>No recipes found.</Text>}
				{recipes && recipes.length > 0 && (
					<View className="flex flex-row flex-wrap gap-2">
						{recipes.map((recipe: any) => (
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
