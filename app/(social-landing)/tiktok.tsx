import { ScrollView, View } from "react-native";

import { MustrdHeader } from "@/components/mustrd-header";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeCardSkeleton } from "@/components/recipe/recipe-card-skeleton";
import { SafeAreaView } from "@/components/safe-area-view";
import { Sandwich } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { usePublicRecipes } from "@/hooks/recipes/use-public-recipes";

export default function TikTokLandingPage() {
	const { recipes, isLoading, isError } = usePublicRecipes();

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<MustrdHeader />
			<ScrollView className="flex-1">
				<View className="p-4 w-full max-w-3xl mx-auto">
					{!!isLoading && (
						<View className="native:flex-row native:flex-wrap native:gap-2 web:grid web:grid-cols-2 md:web:grid-cols-3 web:gap-2">
							{Array.from({ length: 6 }).map((_, index) => (
								<View key={`skeleton-${index}`} className="native:w-[48%]">
									<RecipeCardSkeleton />
								</View>
							))}
						</View>
					)}

					{/* Error State */}
					{!!isError && (
						<View className="flex-1 items-center justify-center py-16">
							<Text className="text-destructive">
								Error loading recipes. Please try again later.
							</Text>
						</View>
					)}

					{/* Empty State */}
					{!!recipes && recipes.length === 0 && !isLoading && (
						<View className="flex-1 items-center justify-center py-16">
							<View className="items-center mb-8">
								<Sandwich className="text-muted-foreground mb-4" size={48} />
								<Text className="text-lg font-medium text-foreground mb-2">
									No public recipes available
								</Text>
								<Text className="text-base text-muted-foreground">
									Check back soon for new recipes
								</Text>
							</View>
						</View>
					)}

					{/* Recipes Grid */}
					{!!recipes && recipes.length > 0 && (
						<View className="native:flex-row native:flex-wrap native:gap-2 web:grid web:grid-cols-2 md:web:grid-cols-3 web:gap-2">
							{recipes.map((recipe: any) => {
								return (
									<View key={recipe.id} className="native:w-[48%]">
										<RecipeCard
											recipe={recipe}
											onPress={() => {
												router.push({
													pathname: "/public/recipes/[id]",
													params: { id: recipe.id },
												});
											}}
										/>
									</View>
								);
							})}
						</View>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
