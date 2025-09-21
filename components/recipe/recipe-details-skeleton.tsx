import { Skeleton } from "@/components/ui/skeleton";
import { View } from "react-native";

export const RecipeDetailsSkeleton = () => {
	return (
		<View className="p-4">
			{/* Recipe Image Skeleton */}
			<View className="mb-6">
				<Skeleton className="h-64 w-full rounded-lg" />
			</View>

			{/* Header Section Skeleton */}
			<View className="mb-6">
				{/* Edit Button Row */}
				<View className="flex flex-row justify-start mb-4">
					<Skeleton className="h-10 w-10 rounded-full" />
				</View>

				{/* Recipe Title and Description */}
				<View>
					<Skeleton className="h-8 w-3/4 mb-2" />
					<Skeleton className="h-5 w-full mb-1" />
					<Skeleton className="h-5 w-2/3" />
				</View>
			</View>

			{/* Nutrition Section Skeleton */}
			<View className="mb-6">
				<Skeleton className="h-20 w-full rounded-lg" />
			</View>

			{/* Ingredients Section Skeleton */}
			<View className="mb-6">
				<View className="flex flex-row justify-between items-center mb-4">
					<Skeleton className="h-6 w-24" />
					<View className="flex flex-row items-center gap-2">
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-5 w-20" />
						<Skeleton className="h-10 w-10 rounded-full" />
					</View>
				</View>
				<View className="space-y-2">
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton key={index} className="h-6 w-full" />
					))}
				</View>
			</View>

			{/* Instructions Section Skeleton */}
			<View className="mb-6">
				<Skeleton className="h-6 w-28 mb-4" />
				<View className="space-y-3">
					{Array.from({ length: 4 }).map((_, index) => (
						<View key={index} className="space-y-1">
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-4/5" />
						</View>
					))}
				</View>
			</View>
		</View>
	);
};
