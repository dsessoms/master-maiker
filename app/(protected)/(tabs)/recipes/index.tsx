import { Button } from "@/components/ui/button";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { useRecipes } from "@/hooks/recipes/use-recipes";
import { View } from "react-native";

export default function Recipes() {
	const router = useRouter();
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
							<View key={recipe.id} className="mb-2 p-2 rounded bg-card">
								<Text className="text-lg font-semibold">{recipe.name}</Text>
								{recipe.description && (
									<Text className="text-sm text-muted-foreground">{recipe.description}</Text>
								)}
							</View>
						))}
					</View>
				)}
			</View>
		</SafeAreaView>
	);
}
