import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Recipe } from "@/lib/schemas";
import { RecipeForm } from "@/components/forms/RecipeForm";
import { SafeAreaView } from "@/components/safe-area-view";
import { useAuth } from "@/context/supabase-provider";
import { useCreateRecipeMutation } from "@/hooks/recipes/use-create-recipe-mutation";

export default function CreateRecipePage() {
	const router = useRouter();
	const { session } = useAuth();
	const { createRecipe } = useCreateRecipeMutation();

	const handleCreate = async (data: Partial<Recipe>) => {
		if (!session) return;
		try {
			await createRecipe(data as Recipe);
			router.back();
		} catch (e) {
			console.error("Error creating recipe:", e);
		}
	};

	return (
		<View className="flex flex-1 bg-background">
			<Stack.Screen
				options={{
					title: "Create Recipe",
				}}
			/>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<RecipeForm onSubmit={handleCreate} isEdit={false} />
			</KeyboardAvoidingView>
		</View>
	);
}
