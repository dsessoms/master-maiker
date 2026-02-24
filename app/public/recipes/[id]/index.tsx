import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { MustrdHeader } from "@/components/mustrd-header";
import { RecipeDetailsContent } from "@/components/recipe/recipe-details-content";
import { RecipeDetailsSkeleton } from "@/components/recipe/recipe-details-skeleton";
import { Text } from "@/components/ui/text";
import { convertDatabaseRecipeToSchema } from "@/lib/utils/convert-database-recipe-to-schema";
import { useAuth } from "@/context/supabase-provider";
import { useCopyRecipeMutation } from "@/hooks/recipes/use-copy-recipe-mutation";
import { useRecipe } from "@/hooks/recipes/use-recipe";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";
import { useRecipes } from "@/hooks/recipes/use-recipes";

export default function PublicRecipeDetails() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { session } = useAuth();
	const { recipe, isLoading, isError } = useRecipe(id!);
	const { recipes: userRecipes } = useRecipes();
	const imageUrl = useRecipeImage(recipe?.image_id);
	const { mutate: copyRecipe, isPending: isCopying } = useCopyRecipeMutation();

	// Check if user is the owner
	const isOwner = session?.user?.id === recipe?.user_id;

	const handleSaveRecipe = () => {
		if (!recipe) return;

		const recipeToCopy = convertDatabaseRecipeToSchema(recipe);

		copyRecipe(recipeToCopy, {
			onSuccess: () => {
				router.push("/(tabs)/(recipes)/recipes");
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
						headerShown: false,
					}}
				/>
				<MustrdHeader />
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
			<View className="flex flex-1 bg-background">
				<Stack.Screen
					options={{
						title: "Recipe Not Found",
						headerShown: false,
					}}
				/>
				<MustrdHeader />
				<View className="flex-1 justify-center items-center p-4">
					<Text className="text-lg font-semibold mb-2">Recipe not found</Text>
					<Text className="text-center text-muted-foreground mb-4">
						This recipe doesn't exist or is no longer public.
					</Text>
					<Button onPress={() => router.back()}>
						<Text>Go Back</Text>
					</Button>
				</View>
			</View>
		);
	}

	const saveActions = (
		<View>
			{session?.user ? (
				isOwner ? (
					<Button
						onPress={() => router.navigate("/(tabs)/(recipes)/recipes")}
						className="w-full"
					>
						<Text>View all your recipes</Text>
					</Button>
				) : (
					<Button
						onPress={handleSaveRecipe}
						disabled={isCopying}
						className="w-full"
					>
						<Text>{isCopying ? "Saving..." : "Save to my recipes"}</Text>
					</Button>
				)
			) : (
				<Button onPress={handleSignUp} className="w-full">
					<Text>Sign up to save this recipe</Text>
				</Button>
			)}
		</View>
	);

	return (
		<View className="flex flex-1 bg-background">
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>
			<MustrdHeader />
			<RecipeDetailsContent
				recipe={recipe}
				imageUrl={imageUrl}
				topActions={saveActions}
			/>
		</View>
	);
}
