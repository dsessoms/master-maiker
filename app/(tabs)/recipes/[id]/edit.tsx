import { ActivityIndicator, Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Recipe } from "@/lib/schemas";
import { RecipeForm } from "@/components/forms/RecipeForm";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { useRecipe } from "@/hooks/recipes/use-recipe";
import { useUpdateRecipeMutation } from "@/hooks/recipes/use-update-recipe-mutation";

export default function EditRecipe() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { recipe, isLoading, error } = useRecipe(id!);
	const { updateRecipe, isPending } = useUpdateRecipeMutation();

	const handleSubmit = async (data: Partial<Recipe>) => {
		if (!id) return;

		try {
			await updateRecipe({ id, recipe: data as Recipe });
			router.replace({ pathname: "/recipes/[id]", params: { id } });
		} catch (error) {
			console.error("Error updating recipe:", error);
		}
	};

	// Transform the recipe data to match the expected format
	const getInitialValues = (): Recipe | undefined => {
		if (!recipe) return undefined;

		return {
			name: recipe.name || "",
			description: recipe.description || "",
			image_url: recipe.image_id || undefined,
			servings: recipe.number_of_servings || 1,
			prep_time_hours: recipe.prep_time_hours || 0,
			prep_time_minutes: recipe.prep_time_minutes || 0,
			cook_time_hours: recipe.cook_time_hours || 0,
			cook_time_minutes: recipe.cook_time_minutes || 0,
			ingredients:
				recipe.ingredient?.map((ing) => {
					if (ing.type === "header") {
						return {
							type: "header" as const,
							name: ing.name || "",
						};
					}
					return {
						type: "ingredient" as const,
						name: ing.name || "",
						number_of_servings: ing.number_of_servings || 1,
						meta: ing.meta || undefined,
						serving: ing.serving
							? {
									measurement_description:
										ing.serving.measurement_description || "",
									number_of_units: ing.serving.number_of_units || 1,
									calories: ing.serving.calories || 0,
									carbohydrate_grams: ing.serving.carbohydrate || 0,
									fat_grams: ing.serving.fat || 0,
									protein_grams: ing.serving.protein || 0,
								}
							: {
									measurement_description: "serving",
									number_of_units: 1,
									calories: 0,
									carbohydrate_grams: 0,
									fat_grams: 0,
									protein_grams: 0,
								},
					};
				}) || [],
			instructions:
				recipe.instruction?.map((inst) => {
					if (inst.type === "header") {
						return {
							type: "header" as const,
							name: inst.name || "",
						};
					}
					return {
						type: "instruction" as const,
						value: inst.value || "",
					};
				}) || [],
		};
	};

	if (isLoading) {
		return (
			<SafeAreaView>
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" />
					<Text className="mt-4">Loading recipe...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (error || !recipe) {
		return (
			<SafeAreaView>
				<View className="flex-1 justify-center items-center">
					<Text className="text-red-500">Failed to load recipe</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView>
			<RecipeForm
				initialValues={getInitialValues()}
				onSubmit={handleSubmit}
				isEdit={true}
			/>
		</SafeAreaView>
	);
}
