import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { RecipeDetailsContent } from "@/components/recipe/recipe-details-content";
import { RecipeDetailsSkeleton } from "@/components/recipe/recipe-details-skeleton";
import { Text } from "@/components/ui/text";
import { convertDatabaseRecipeToSchema } from "@/lib/utils/convert-database-recipe-to-schema";
import { useCopyRecipeMutation } from "@/hooks/recipes/use-copy-recipe-mutation";
import { useRecipe } from "@/hooks/recipes/use-recipe";
import { useRecipeImage } from "@/hooks/recipes/use-recipe-image";

export default function CatalogRecipeDetails() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { recipe, isLoading, isError } = useRecipe(id!);
	const imageUrl = useRecipeImage(recipe?.image_id);
	const { mutate: copyRecipe, isPending: isCopying } = useCopyRecipeMutation();

	const handleSaveRecipe = () => {
		if (!recipe) return;
		const recipeToCopy = convertDatabaseRecipeToSchema(recipe);
		copyRecipe(recipeToCopy, {
			onSuccess: () => {
				router.push("/(tabs)/(recipes)/recipes");
			},
		});
	};

	if (isLoading) {
		return (
			<View className="flex flex-1 bg-background">
				<Stack.Screen options={{ title: "Recipe" }} />
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
				<Stack.Screen options={{ title: "Recipe Not Found" }} />
				<View className="flex-1 justify-center items-center p-4">
					<Text className="text-lg font-semibold mb-2">Recipe not found</Text>
					<Text className="text-center text-muted-foreground mb-4">
						This recipe doesn&apos;t exist or is no longer available.
					</Text>
					<Button onPress={() => router.back()}>
						<Text>Go Back</Text>
					</Button>
				</View>
			</View>
		);
	}

	const saveAction = (
		<Button onPress={handleSaveRecipe} disabled={isCopying} className="w-full">
			<Text>{isCopying ? "Saving..." : "Save to my recipes"}</Text>
		</Button>
	);

	return (
		<View className="flex flex-1 bg-background">
			<Stack.Screen options={{ title: recipe.name }} />
			<RecipeDetailsContent
				recipe={recipe}
				imageUrl={imageUrl}
				topActions={saveAction}
			/>
		</View>
	);
}
