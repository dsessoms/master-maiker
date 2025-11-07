import Animated, {
	runOnJS,
	runOnUI,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";

import { useDnD } from "@/components/ui/dnd/dnd-context";

interface DraggableItemProps {
	children: React.ReactNode;
	data?: any; // Optional data to pass when dropped
	onDragStateChange?: (isDragging: boolean) => void; // Callback when drag state changes
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
	children,
	data,
	onDragStateChange,
}) => {
	const {
		startDrag,
		updateDragPosition,
		endDrag,
		isDragging: globalIsDragging,
	} = useDnD();
	const itemRef = useRef<View>(null);
	const isCurrentlyDragging = useSharedValue(false);
	const hasDragged = useRef(false);

	// Create a handler function that can be called from worklet
	const handleDragStart = () => {
		// Measure position right when drag starts to get current position
		itemRef.current?.measureInWindow((x, y, width, height) => {
			hasDragged.current = true; // Mark that a drag has started
			if (onDragStateChange) {
				onDragStateChange(true);
			}
			startDrag(children, { x, y, width, height }, data);
			// Wait for next frame to ensure portal is rendered before hiding original
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					// Double RAF to ensure render has completed
					runOnUI(() => {
						"worklet";
						isCurrentlyDragging.value = true;
					})();
				});
			});
		});
	};

	const handleDragEnd = () => {
		endDrag();
		// Reset the flag after a short delay to allow press events to check it
		setTimeout(() => {
			hasDragged.current = false;
			if (onDragStateChange) {
				onDragStateChange(false);
			}
		}, 100);
	};

	const panGesture = Gesture.Pan()
		.onStart(() => {
			"worklet";

			// Start drag in context - this will create the portal overlay
			runOnJS(handleDragStart)();
		})
		.onUpdate((event) => {
			"worklet";

			// Update position in context (now a worklet, no runOnJS needed)
			updateDragPosition(event.translationX, event.translationY);
		})
		.onEnd(() => {
			"worklet";
			isCurrentlyDragging.value = false;

			// End drag in context
			runOnJS(handleDragEnd)();
		})
		.activateAfterLongPress(200);

	// Hide the original item when dragging
	const itemStyle = useAnimatedStyle(() => {
		"worklet";
		return {
			opacity: isCurrentlyDragging.value ? 0 : 1,
		};
	}, []);

	return (
		<GestureDetector gesture={panGesture}>
			<Animated.View ref={itemRef} style={[styles.container, itemStyle]}>
				{children}
			</Animated.View>
		</GestureDetector>
	);
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
	},
});
