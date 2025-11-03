import { ChatDisplayMessage, ChatTab } from "@/components/recipe/chat-tab";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FormTab } from "@/components/recipe/form-tab";
import { RecipePreview } from "@/hooks/recipes/use-generate-recipe-chat";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { useCreateRecipeMutation } from "@/hooks/recipes/use-create-recipe-mutation";
import { useGenerateRecipeMutation } from "@/hooks/recipes/use-generate-recipe-mutation";
import { useParseRecipeMutation } from "@/hooks/recipes/use-parse-recipe-mutation";

export default function GenerateRecipe() {
	const [activeTab, setActiveTab] = useState("chat");
	const { generateRecipe, isPending: isGenerating } =
		useGenerateRecipeMutation();
	const { createRecipe } = useCreateRecipeMutation();
	const { parseRecipe, isPending: isParsing } = useParseRecipeMutation();

	const handleFormGenerate = async (options: any) => {
		try {
			const result = await generateRecipe(options);

			if (result.recipe) {
				// Save the generated recipe
				const savedRecipe = await createRecipe(result.recipe);

				// Navigate to the saved recipe
				router.replace(`/recipes/${savedRecipe.id}`);
			} else {
				console.error("Failed to generate recipe - no recipe returned");
				// TODO: You might want to show an error toast here
			}
		} catch (error) {
			console.error("Error generating recipe:", error);
			// TODO: You might want to show an error toast here
		}
	};

	const handleChatGenerate = async (recipePreview: RecipePreview) => {
		try {
			// Use the parse endpoint with the recipe preview data
			const result = await parseRecipe(recipePreview);

			if (result.recipe) {
				// Save the parsed recipe
				const savedRecipe = await createRecipe(result.recipe);

				// Navigate to the saved recipe
				router.replace(`/recipes/${savedRecipe.id}`);
			} else {
				console.error("Failed to parse recipe - no recipe returned");
				// TODO: You might want to show an error toast here
			}
		} catch (error) {
			console.error("Error parsing recipe:", error);
			// TODO: You might want to show an error toast here
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-background">
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<View className="flex-1 p-4">
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="flex-1"
					>
						<TabsList>
							<TabsTrigger value="chat">
								<Text>Chat</Text>
							</TabsTrigger>
							<TabsTrigger value="form">
								<Text>Form</Text>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="form" className="flex-1">
							<ScrollView
								contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
							>
								<FormTab
									onGenerate={handleFormGenerate}
									isGenerating={isGenerating}
								/>
							</ScrollView>
						</TabsContent>

						<TabsContent value="chat" className="flex-1">
							<ChatTab
								onGenerate={handleChatGenerate}
								isGenerating={isGenerating || isParsing}
							/>
						</TabsContent>
					</Tabs>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
