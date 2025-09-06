import { router, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { TouchableOpacity } from "react-native";
import { View } from "react-native";
import { useRecipes } from "@/hooks/recipes/use-recipes";

export default function Recipes() {
	const localRouter = useRouter();
	const { recipes, isLoading, isError } = useRecipes();

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<Button onPress={() => router.push("/recipes/create")}>
				<Text>Create</Text>
			</Button>
			<View className="mt-4">
				{isLoading && <Text>Loading...</Text>}
				{isError && <Text>Error loading recipes.</Text>}
				{recipes && recipes.length === 0 && <Text>No recipes found.</Text>}
				{recipes && recipes.length > 0 && (
					<View>
						{recipes.map((recipe: any) => (
							<TouchableOpacity
								key={recipe.id}
								onPress={() => {
									localRouter.push({
										pathname: "/recipes/[id]",
										params: { id: recipe.id },
									});
								}}
								className="mb-2 p-4 rounded-lg bg-card border border-border active:bg-muted"
							>
								<Text className="text-lg font-semibold mb-1">
									{recipe.name}
								</Text>
								{recipe.description && (
									<Text className="text-sm text-muted-foreground">
										{recipe.description}
									</Text>
								)}
								{recipe.macros && recipe.macros.length > 0 && (
									<View className="flex flex-row mt-2 space-x-4">
										<Text className="text-xs text-muted-foreground">
											{Math.round(recipe.macros[0].calories || 0)} cal
										</Text>
										<Text className="text-xs text-muted-foreground">
											{Math.round(recipe.macros[0].protein || 0)}g protein
										</Text>
									</View>
								)}
							</TouchableOpacity>
						))}
					</View>
				)}
			</View>
		</SafeAreaView>
	);
}
