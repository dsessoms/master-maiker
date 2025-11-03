import { ActivityIndicator, Alert, View } from "react-native";
import { Form, FormField, FormInput } from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { GetParsedRecipeResponse } from "@/app/api/recipes/parse/index+api";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { router } from "expo-router";
import { useCreateRecipeMutation } from "@/hooks/recipes/use-create-recipe-mutation";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const ImportRecipeSchema = z.object({
	url: z.string().url("Please enter a valid URL"),
});

type ImportRecipeForm = z.infer<typeof ImportRecipeSchema>;

export default function ImportRecipe() {
	const [isLoading, setIsLoading] = useState(false);
	const { createRecipe } = useCreateRecipeMutation();

	const form = useForm<ImportRecipeForm>({
		resolver: zodResolver(ImportRecipeSchema),
		defaultValues: {
			url: "",
		},
	});

	const handleImport = async (data: ImportRecipeForm) => {
		setIsLoading(true);
		try {
			// Call the parse recipe endpoint
			const response = await axiosWithAuth.get<GetParsedRecipeResponse>(
				`/api/recipes/parse?url=${encodeURIComponent(data.url)}`,
			);

			if (!response.data.recipe) {
				Alert.alert(
					"Error",
					"Could not parse recipe from the provided URL. Please check the URL and try again.",
				);
				return;
			}

			// Save the parsed recipe
			const savedRecipe = await createRecipe(response.data.recipe);

			// Navigate to the saved recipe
			router.replace(`/recipes/${savedRecipe.id}`);
		} catch (error) {
			console.error("Error importing recipe:", error);
			Alert.alert(
				"Error",
				"Failed to import recipe. Please check the URL and try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 p-4">
				<View className="mb-6">
					<Text className="text-2xl font-bold mb-2">Import Recipe</Text>
					<Text className="text-muted-foreground">
						Enter a URL from a recipe website to automatically import the recipe
						details.
					</Text>
				</View>

				<Form {...form}>
					<View className="gap-4 mb-6">
						<FormField
							control={form.control}
							name="url"
							render={({ field }) => (
								<FormInput
									label="Recipe URL"
									placeholder="https://example.com/recipe"
									autoCapitalize="none"
									autoCorrect={false}
									keyboardType="url"
									{...field}
								/>
							)}
						/>
					</View>
				</Form>

				<View className="gap-3">
					<Button
						size="default"
						variant="default"
						onPress={form.handleSubmit(handleImport)}
						disabled={isLoading}
					>
						{isLoading ? (
							<View className="flex-row items-center gap-2">
								<ActivityIndicator size="small" color="white" />
								<Text className="text-primary-foreground">Importing...</Text>
							</View>
						) : (
							<Text className="text-primary-foreground">Import Recipe</Text>
						)}
					</Button>

					<Button
						size="default"
						variant="outline"
						onPress={() => router.back()}
						disabled={isLoading}
					>
						<Text>Cancel</Text>
					</Button>
				</View>
			</View>
		</SafeAreaView>
	);
}
