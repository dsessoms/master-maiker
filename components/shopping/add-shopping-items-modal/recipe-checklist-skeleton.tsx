import { Skeleton } from "@/components/ui/skeleton";
import { View } from "react-native";

export const RecipeCheckListSkeleton = () => {
	return (
		<View className="gap-2 rounded-lg bg-card p-4">
			{/* Recipe header with title and servings controls */}
			<View className="flex-row items-center justify-between">
				<Skeleton className="h-6 w-40 flex-1 mr-4" />
				<View className="flex-row items-center gap-2">
					<Skeleton className="h-8 w-8 rounded" />
					<Skeleton className="h-4 w-8" />
					<Skeleton className="h-8 w-8 rounded" />
				</View>
			</View>

			{/* Ingredient skeletons - show 3-5 placeholder items */}
			{[1, 2, 3, 4].map((i) => (
				<View key={i} className="flex-row items-center gap-2">
					<Skeleton className="h-5 w-5 rounded" />
					<View className="flex-1 flex-row gap-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-24" />
					</View>
				</View>
			))}
		</View>
	);
};
