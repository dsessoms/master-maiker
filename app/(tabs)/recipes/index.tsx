import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, Plus } from "@/lib/icons";
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

	const handleCreateRecipe = () => {
		router.push("/recipes/create");
	};

	const handleImportRecipe = () => {
		// TODO: Implement import from URL functionality
		console.log("Import recipe from URL");
	};

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			{/* Main content */}
			<View className="flex-1 mt-4">
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

			{/* Floating Action Button with Dropdown Menu */}
			<View className="absolute bottom-6 right-6">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="default"
							size="icon"
							className="w-12 h-12 rounded-full shadow-sm"
						>
							<Plus className="text-primary-foreground" size={24} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="end" className="w-64 mb-2">
						<DropdownMenuItem onPress={handleCreateRecipe}>
							<Plus className="text-foreground mr-2" size={16} />
							<Text>Create new recipe</Text>
						</DropdownMenuItem>
						<DropdownMenuItem onPress={handleImportRecipe}>
							<Link className="text-foreground mr-2" size={16} />
							<Text>Import recipe from URL</Text>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</View>
		</SafeAreaView>
	);
}
