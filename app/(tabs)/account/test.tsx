import { ShoppingBasket } from "@/lib/icons";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import type { SortableGridRenderItem } from "react-native-sortables";
import Sortable from "react-native-sortables";

const DATA = Array.from({ length: 30 }, (_, index) => `Item ${index + 1}`);

export default function Example() {
	const scrollableRef = useAnimatedRef<Animated.ScrollView>();

	const renderItem = useCallback<SortableGridRenderItem<string>>(
		({ item }) => (
			<View style={styles.card}>
				<Text style={styles.text}>{item}</Text>
				<Sortable.Handle>
					<ShoppingBasket size={20} color="#666" />
				</Sortable.Handle>
			</View>
		),
		[],
	);

	return (
		<Animated.ScrollView
			contentContainerStyle={styles.contentContainer}
			ref={scrollableRef}
		>
			<Sortable.Grid
				columnGap={10}
				columns={1}
				data={DATA}
				renderItem={renderItem}
				rowGap={10}
				scrollableRef={scrollableRef} // required for auto scroll
				// autoScrollActivationOffset={75}
				// autoScrollSpeed={1}
				autoScrollEnabled={true}
				customHandle={true}
				activeItemShadowOpacity={0}
				enableActiveItemSnap={false}
			/>
		</Animated.ScrollView>
	);
}

const styles = StyleSheet.create({
	card: {
		alignItems: "center",
		backgroundColor: "#36877F",
		borderRadius: 10,
		height: 100,
		justifyContent: "center",
	},
	contentContainer: {
		padding: 10,
	},
	text: {
		color: "white",
		fontWeight: "bold",
	},
});
