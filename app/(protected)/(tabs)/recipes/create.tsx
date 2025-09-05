import { PostRecipesRequest } from "../../../api/recipes/index+api";
import { RecipeForm } from "@/components/forms/RecipeForm";
import { SafeAreaView } from "@/components/safe-area-view";
import { ScrollView } from "react-native";
import { useAuth } from "@/context/supabase-provider";
import { useCreateRecipeMutation } from "@/hooks/recipes/use-create-recipe-mutation";
import { useRouter } from "expo-router";

export default function CreateRecipePage() {
	const router = useRouter();
	const { session } = useAuth();
	const { createRecipe } = useCreateRecipeMutation();

	const handleCreate = async (data: Partial<PostRecipesRequest>) => {
		if (!session) return;
		try {
			await createRecipe(data as PostRecipesRequest);
			router.back();
		} catch (e) {
			console.error("Error creating recipe:", e);
		}
	};

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			<ScrollView>
				<RecipeForm onSubmit={handleCreate} isEdit={false} />
			</ScrollView>
		</SafeAreaView>
	);
}
