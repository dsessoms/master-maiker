import { Recipe } from "@/lib/schemas";
import { RecipeForm } from "@/components/forms/RecipeForm";
import { SafeAreaView } from "@/components/safe-area-view";
import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "@/context/supabase-provider";
import { useCreateRecipeMutation } from "@/hooks/recipes/use-create-recipe-mutation";
import { useRouter } from "expo-router";

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
		<SafeAreaView className="flex flex-1 bg-background">
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
			>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
				>
					<RecipeForm onSubmit={handleCreate} isEdit={false} />
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
