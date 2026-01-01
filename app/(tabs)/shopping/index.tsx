import * as React from "react";

import { Redirect } from "expo-router";
import { SafeAreaView } from "@/components//safe-area-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { useMemo } from "react";
import { useShoppingLists } from "@/hooks/shopping-lists/use-shopping-lists";

export default function Shopping() {
	const { lists, isLoading } = useShoppingLists();

	const defaultList = useMemo(
		() => lists?.find((list) => list.is_default),
		[lists],
	);

	if (isLoading) {
		return (
			<SafeAreaView className="flex flex-1 bg-background">
				<View className="p-4">
					<Skeleton className="h-10 w-48 mb-4" />
				</View>
				<View className="flex-1 p-4 bg-muted-background gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</View>
			</SafeAreaView>
		);
	}

	if (defaultList) {
		return <Redirect href={`/(tabs)/shopping/${defaultList.id}`} />;
	}

	return (
		<SafeAreaView className="flex flex-1 items-center justify-center bg-background">
			<Text>No shopping list selected</Text>
		</SafeAreaView>
	);
}
