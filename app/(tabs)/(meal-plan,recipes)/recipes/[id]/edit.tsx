import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Recipe } from "@/lib/schemas";
import { RecipeForm } from "@/components/forms/RecipeForm";
import { Text } from "@/components/ui/text";
import { useRecipe } from "@/hooks/recipes/use-recipe";
import { useUpdateRecipeMutation } from "@/hooks/recipes/use-update-recipe-mutation";
import { convertDatabaseRecipeToSchema } from "@/lib/utils/convert-database-recipe-to-schema";

export default function EditRecipe() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { recipe, isLoading, error } = useRecipe(id!);
	const { updateRecipe } = useUpdateRecipeMutation();

	const handleSubmit = async (data: Partial<Recipe>) => {
		if (!id) return;

		try {
			await updateRecipe({ id, recipe: data as Recipe });
			router.replace({ pathname: "/recipes/[id]", params: { id } });
		} catch (error) {
			console.error("Error updating recipe:", error);
		}
	};

	const initialValues = recipe
		? convertDatabaseRecipeToSchema(recipe)
		: undefined;

	if (isLoading) {
		return (
			<View className="flex flex-1 bg-background">
				<View className="flex-1 justify-center items-center">
					<LoadingIndicator size="large" />
					<Text className="mt-4">Loading recipe...</Text>
				</View>
			</View>
		);
	}

	if (error || !recipe) {
		return (
			<View className="flex flex-1 bg-background">
				<View className="flex-1 justify-center items-center">
					<Text className="text-red-500">Failed to load recipe</Text>
				</View>
			</View>
		);
	}

	return (
		<View className="flex flex-1 bg-background">
			<Stack.Screen
				options={{
					title: "Edit Recipe",
				}}
			/>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<RecipeForm
					initialValues={initialValues}
					onSubmit={handleSubmit}
					isEdit={true}
				/>
			</KeyboardAvoidingView>
		</View>
	);
}
