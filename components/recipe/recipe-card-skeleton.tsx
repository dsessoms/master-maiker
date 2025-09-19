import { Skeleton } from "@/components/ui/skeleton";
import { View } from "react-native";

export const RecipeCardSkeleton = () => {
	return (
		<View className="flex flex-col bg-card border border-border rounded-lg overflow-hidden">
			{/* Image skeleton */}
			<View className="relative">
				<Skeleton className="h-48 w-full rounded-t-lg rounded-b-none" />
			</View>

			{/* Content skeleton */}
			<View className="flex flex-col p-2 h-16 gap-1">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
			</View>
		</View>
	);
};
