import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Globe,
	Link,
	Lock,
	MoreHorizontalIcon,
	PencilIcon,
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
import { RecipeDetailsContent } from "@/components/recipe/recipe-details-content";
import { RecipeDetailsSkeleton } from "@/components/recipe/recipe-details-skeleton";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { convertDatabaseRecipeToSchema } from "@/lib/utils/convert-database-recipe-to-schema";
import { useAuth } from "@/context/supabase-provider";
import { useCopyRecipeMutation } from "@/hooks/recipes/use-copy-recipe-mutation";
import { useDeleteRecipeMutation } from "@/hooks/recipes/use-delete-recipe-mutation";
import { usePatchRecipeMutation } from "@/hooks/recipes/use-patch-recipe-mutation";
import { useRecipe } from "@/hooks/recipes/use-recipe";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";
import { useRecipes } from "@/hooks/recipes/use-recipes";

export default function RecipeDetails() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { session } = useAuth();
	const { recipe, isLoading, isError } = useRecipe(id!);
	const imageUrl = useRecipeImage(recipe?.image_id);
	const { deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();
	const { mutate: patchRecipe, isPending: isPatching } =
		usePatchRecipeMutation();
	const { mutate: copyRecipe, isPending: isCopying } = useCopyRecipeMutation();
	const [recipeServings, setRecipeServings] = useState<number>(1);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [showAddToShoppingListModal, setShowAddToShoppingListModal] =
		useState(false);

	// Check if current user is the owner
	const isOwner = recipe && session?.user?.id === recipe.user_id;
	// Check if recipe is public
	const isPublic = recipe?.visibility === "public";

	useEffect(() => {
		if (recipe) {
			setRecipeServings(recipe.number_of_servings);
		}
	}, [recipe]);

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

	const handleToggleVisibility = async () => {
		if (!recipe || !isOwner) return;

		const newVisibility = isPublic ? "owner" : "public";
		patchRecipe({
			recipeId: recipe.id,
			updates: { visibility: newVisibility },
		});
	};

	const handleCopyPublicLink = async () => {
		if (!recipe) return;

		const publicUrl = `${window.location.origin}/public/recipes/${recipe.id}`;

		// Try to use the Clipboard API
		if (navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(publicUrl);
			} catch (err) {
				console.error("Failed to copy link:", err);
			}
		}
	};

	const handleSaveRecipe = async () => {
		if (!recipe || isOwner || !session?.user) return;

		const recipeCopy = convertDatabaseRecipeToSchema(recipe);

		copyRecipe(recipeCopy, {
			onSuccess: () => {
				router.push("/recipes");
			},
			onError: (error) => {
				console.error("Failed to save recipe:", error);
			},
		});
	};

	const handleSignUp = () => {
		router.push("/sign-up");
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
					<View className="w-full max-w-3xl mx-auto">
						<RecipeDetailsSkeleton />
					</View>
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

	const ownerMenuActions = isOwner && (
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
			<DropdownMenuContent side="bottom" align="end" className="w-48">
				<DropdownMenuItem onPress={handleEditRecipe}>
					<PencilIcon className="text-foreground mr-2" size={16} />
					<Text>Edit</Text>
				</DropdownMenuItem>
				<DropdownMenuItem onPress={handleAddToShoppingList}>
					<ShoppingCart className="text-foreground mr-2" size={16} />
					<Text>Add to List</Text>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<View className="px-2 py-2">
					<View className="flex-row items-center justify-between">
						<View className="flex-row items-center gap-2">
							{isPublic ? (
								<Globe className="text-foreground" size={16} />
							) : (
								<Lock className="text-foreground" size={16} />
							)}
							<Text className="text-sm">{isPublic ? "Public" : "Private"}</Text>
						</View>
						<Switch
							checked={isPublic}
							onCheckedChange={handleToggleVisibility}
							disabled={isPatching}
						/>
					</View>
				</View>
				{isPublic && (
					<DropdownMenuItem onPress={handleCopyPublicLink}>
						<Link className="text-foreground mr-2" size={16} />
						<Text>Copy Link</Text>
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem onPress={handleDeleteRecipe}>
					<Trash2Icon className="text-destructive mr-2" size={16} />
					<Text className="text-destructive">Delete</Text>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const saveActions = !isOwner && (
		<View className="mt-4">
			{session?.user ? (
				<Button
					onPress={handleSaveRecipe}
					disabled={isCopying}
					className="w-full"
				>
					<Text>{isCopying ? "Saving..." : "Save to My Recipes"}</Text>
				</Button>
			) : (
				<Button onPress={handleSignUp} className="w-full">
					<Text>Sign Up to Save This Recipe</Text>
				</Button>
			)}
		</View>
	);

	return (
		<View className="flex flex-1 bg-background">
			<Stack.Screen
				options={{
					title: recipe.name,
				}}
			/>
			<RecipeDetailsContent
				recipe={recipe}
				imageUrl={imageUrl}
				headerActions={ownerMenuActions}
				topActions={saveActions}
				onServingsChange={setRecipeServings}
			/>

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
