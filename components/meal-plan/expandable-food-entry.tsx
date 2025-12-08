import { View } from "react-native";
import { Text } from "@/components/ui/text";
import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from "@/components/ui/collapsible";
import { ProfileServingBadge } from "./profile-serving-badge";
import {
	type Recipe,
	type RecipeEntry,
} from "@/hooks/meal-plans/use-generate-meal-plan-chat";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";

interface ExpandableFoodEntryProps {
	entry: RecipeEntry;
	recipe: Recipe | undefined;
	recipeName: string;
}

export const ExpandableFoodEntry = ({
	entry,
	recipe,
	recipeName,
}: ExpandableFoodEntryProps) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger asChild>
				<View className="flex-row items-center justify-between py-2 px-3 rounded-lg bg-gray-100 active:bg-gray-200">
					<Text className="text-sm flex-1 font-medium">{recipeName}</Text>
					<View className="flex-row items-center gap-2">
						{Object.keys(entry.profile_servings).map((profileId) => (
							<ProfileServingBadge
								key={profileId}
								profileId={profileId}
								servings={entry.profile_servings[profileId]}
							/>
						))}
						<ChevronDown
							size={18}
							className={`text-gray-600 ${isOpen ? "rotate-180" : ""}`}
						/>
					</View>
				</View>
			</CollapsibleTrigger>

			<CollapsibleContent className="mt-2 pl-3">
				{/* Ingredients */}
				{recipe?.ingredients && recipe.ingredients.length > 0 && (
					<View className="mb-4">
						<Text className="text-sm font-semibold mb-2">Ingredients:</Text>
						<View className="gap-1">
							{recipe.ingredients.map((ingredient, idx) => (
								<Text key={idx} className="text-xs text-gray-700 ml-2">
									• {ingredient}
								</Text>
							))}
						</View>
					</View>
				)}

				{/* Instructions */}
				{recipe?.instructions && recipe.instructions.length > 0 && (
					<View>
						<Text className="text-sm font-semibold mb-2">Instructions:</Text>
						<View className="gap-2">
							{recipe.instructions.map((instruction, idx) => (
								<View key={idx} className="flex-row gap-2">
									<Text className="text-xs font-semibold text-gray-600 w-5">
										{idx + 1}.
									</Text>
									<Text className="text-xs text-gray-700 flex-1 flex-wrap">
										{instruction}
									</Text>
								</View>
							))}
						</View>
					</View>
				)}

				{/* No ingredients or instructions message */}
				{(!recipe?.ingredients || recipe.ingredients.length === 0) &&
					(!recipe?.instructions || recipe.instructions.length === 0) && (
						<Text className="text-xs text-gray-500 italic">
							No ingredients or instructions available
						</Text>
					)}
			</CollapsibleContent>
		</Collapsible>
	);
};
