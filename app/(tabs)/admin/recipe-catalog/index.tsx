import { ScrollView, View } from "react-native";
import { Stack, router } from "expo-router";

import { Input } from "@/components/ui/input";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeCardSkeleton } from "@/components/recipe/recipe-card-skeleton";
import { Search } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { useCatalogRecipes } from "@/hooks/recipes/use-catalog-recipes";
import { useState } from "react";

export default function RecipeCatalog() {
	const [searchQuery, setSearchQuery] = useState("");
	const { recipes, total, isLoading, isError } = useCatalogRecipes({
		search: searchQuery,
	});

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen options={{ title: "Recipe Catalog" }} />
			<ScrollView className="flex-1">
				<View className="p-4 w-full max-w-3xl mx-auto">
					{/* Search */}
					<View className="pb-4">
						<View className="relative">
							<Input
								placeholder="Search catalog"
								value={searchQuery}
								onChangeText={setSearchQuery}
								className="pl-10"
							/>
							<View className="absolute left-3 top-1/2 -translate-y-1/2">
								<Search className="text-muted-foreground" size={16} />
							</View>
						</View>
						{total > 0 && (
							<Text className="text-xs text-muted-foreground mt-2">
								{total} recipe{total !== 1 ? "s" : ""}
							</Text>
						)}
					</View>

					{/* Skeletons */}
					{isLoading && (
						<View className="native:flex-row native:flex-wrap native:gap-2 web:grid web:grid-cols-2 md:web:grid-cols-3 web:gap-2">
							{Array.from({ length: 6 }).map((_, index) => (
								<View key={`skeleton-${index}`} className="native:w-[48%]">
									<RecipeCardSkeleton />
								</View>
							))}
						</View>
					)}

					{/* Error */}
					{isError && <Text>Error loading catalog recipes.</Text>}

					{/* Empty */}
					{!isLoading && recipes?.length === 0 && (
						<Text className="text-muted-foreground text-center py-16">
							{searchQuery
								? `No recipes match "${searchQuery}".`
								: "No catalog recipes found."}
						</Text>
					)}

					{/* Grid */}
					{recipes && recipes.length > 0 && (
						<View className="native:flex-row native:flex-wrap native:gap-2 web:grid web:grid-cols-2 md:web:grid-cols-3 web:gap-2">
							{recipes.map((recipe) => (
								<View key={recipe.id} className="native:w-[48%]">
									<RecipeCard
										recipe={recipe}
										onPress={() =>
											router.push({
												pathname: "/(tabs)/admin/recipe-catalog/[id]",
												params: { id: recipe.id },
											})
										}
									/>
								</View>
							))}
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
