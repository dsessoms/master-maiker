import { ActivityIndicator, ScrollView, View } from "react-native";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { CircleCheck } from "@/lib/icons/circle-check";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeServingSelectorModal } from "@/components/meal-plan/recipe-serving-selector-modal";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { TouchableOpacity } from "react-native";
import { useAddFoodEntry } from "@/hooks/recipes/use-add-food-entry";
import { useProfiles } from "@/hooks/profiles/useProfiles";
import { useRecipes } from "@/hooks/recipes/use-recipes";
import { useState } from "react";

type RecipeSelection = {
	recipeId: string;
	servings: { profile_id: string; servings: number }[];
};

export default function AddRecipeScreen() {
	const { mealType, date } = useLocalSearchParams();
	const router = useRouter();
	const { recipes, isLoading } = useRecipes();
	const { profiles = [] } = useProfiles();
	const addFoodEntryMutation = useAddFoodEntry();

	const [selectedRecipes, setSelectedRecipes] = useState<RecipeSelection[]>([]);
	const [openModals, setOpenModals] = useState<{ [recipeId: string]: boolean }>(
		{},
	);

	if (!mealType || !date) {
		return <Redirect href="/(tabs)/(meal-plan)/meal-plan" />;
	}

	const handleRecipeToggle = (recipeId: string) => {
		setSelectedRecipes((prev) => {
			const existing = prev.find((r) => r.recipeId === recipeId);
			if (existing) {
				return prev.filter((r) => r.recipeId !== recipeId);
			}
			// Initialize with 1 serving for each profile
			return [
				...prev,
				{
					recipeId,
					servings: profiles.map((p) => ({ profile_id: p.id, servings: 1 })),
				},
			];
		});
	};

	const handleServingsChange = (
		recipeId: string,
		newServings: { profile_id: string; servings: number }[],
	) => {
		setSelectedRecipes((prev) =>
			prev.map((r) =>
				r.recipeId === recipeId ? { ...r, servings: newServings } : r,
			),
		);
	};

	const handleAddRecipes = async () => {
		if (selectedRecipes.length === 0) {
			alert("Please select at least one recipe");
			return;
		}

		try {
			// Add each selected recipe to the meal plan
			for (const selection of selectedRecipes) {
				await addFoodEntryMutation.mutateAsync({
					date: date as string,
					mealType: mealType as "Breakfast" | "Lunch" | "Dinner" | "Snack",
					recipeId: selection.recipeId,
					profileServings: selection.servings,
				});
			}

			// Success - go back to meal plan
			router.back();
		} catch (error) {
			console.error("Error adding recipes:", error);
			alert("Failed to add recipes to meal plan");
		}
	};

	const isAnyRecipeSelected = selectedRecipes.length > 0;

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<Stack.Screen
				options={{
					title: "Add Recipes",
				}}
			/>
			<View className="flex flex-1 gap-4 p-4">
				{/* Header */}
				<View className="flex flex-col gap-2">
					<Text className="text-2xl font-bold">Add Recipes</Text>
					<Text className="text-sm text-muted-foreground">
						{mealType} on {date}
					</Text>
				</View>

				{/* Recipe list */}
				{isLoading ? (
					<View className="flex flex-1 items-center justify-center">
						<ActivityIndicator size="large" />
					</View>
				) : (
					<ScrollView
						contentContainerStyle={{
							paddingBottom: 16,
						}}
						className="flex-1 native:flex"
					>
						<View className="native:flex-row native:flex-wrap native:gap-2 web:grid web:grid-cols-2 md:web:grid-cols-3 web:gap-2">
							{recipes && recipes.length > 0 ? (
								recipes.map((recipe) => {
									const selection = selectedRecipes.find(
										(r) => r.recipeId === recipe.id,
									);
									const modalOpen = openModals[recipe.id] || false;
									const setModalOpen = (open: boolean) => {
										setOpenModals((prev) => ({
											...prev,
											[recipe.id]: open,
										}));
									};
									const servings =
										selection?.servings ??
										profiles.map((p) => ({
											profile_id: p.id,
											servings: 1,
										}));

									const servingsText =
										servings.length === 0
											? "No profiles selected"
											: servings.length === 1
												? `${profiles.find((p) => p.id === servings[0].profile_id)?.name}: ${servings[0].servings} serving${servings[0].servings !== 1 ? "s" : ""}`
												: `${servings.length} profiles selected`;

									const checkboxOverlay = (
										<View className="absolute inset-0">
											{/* Translucent overlay */}
											{selection && (
												<View className="absolute inset-0 bg-black/50" />
											)}
											{/* Checkbox icon */}
											<View className="absolute top-3 right-3">
												{selection && (
													<CircleCheck size={32} className="text-primary" />
												)}
											</View>
										</View>
									);

									const servingsContent = !!selection && (
										<TouchableOpacity onPress={() => setModalOpen(true)}>
											<Text className="text-xs text-primary line-clamp-1 font-medium">
												{servingsText}
											</Text>
										</TouchableOpacity>
									);

									return (
										<View key={recipe.id} className="native:w-[48%]">
											<RecipeCard
												recipe={recipe}
												onPress={() => handleRecipeToggle(recipe.id)}
												overlay={checkboxOverlay}
											>
												{servingsContent}
											</RecipeCard>

											{/* Serving selector modal */}
											<RecipeServingSelectorModal
												open={modalOpen}
												onOpenChange={setModalOpen}
												profiles={profiles}
												onConfirm={(
													newServings: {
														profile_id: string;
														servings: number;
													}[],
												) => handleServingsChange(recipe.id, newServings)}
											/>
										</View>
									);
								})
							) : (
								<View className="flex items-center justify-center py-8 w-full">
									<Text className="text-muted-foreground">
										No recipes available
									</Text>
								</View>
							)}
						</View>
					</ScrollView>
				)}

				{/* Footer buttons */}
				<View className="flex flex-row gap-2 pt-4 border-t border-border">
					<Button
						variant="outline"
						onPress={() => router.back()}
						disabled={addFoodEntryMutation.isPending}
						className="flex-1"
					>
						<Text>Cancel</Text>
					</Button>
					<Button
						onPress={handleAddRecipes}
						disabled={!isAnyRecipeSelected || addFoodEntryMutation.isPending}
						className="flex-1"
					>
						<Text>
							{addFoodEntryMutation.isPending
								? "Adding..."
								: `Add ${selectedRecipes.length} Recipe${selectedRecipes.length !== 1 ? "s" : ""}`}
						</Text>
					</Button>
				</View>
			</View>
		</SafeAreaView>
	);
}
