import * as React from "react";

import { ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "@/components//safe-area-view";
import { Text } from "@/components/ui/text";
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
			<SafeAreaView className="flex flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
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
