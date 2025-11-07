import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { runOnJS, runOnUI } from "react-native-reanimated";

import { useDnD } from "@/components/ui/dnd/dnd-context";

interface DroppableAreaProps {
	children: React.ReactNode;
	onDrop?: (draggedData: any) => void;
	dropId: string; // Unique identifier for this drop zone
	className?: string;
	onActiveChange?: (isActive: boolean) => void; // Callback when hover state changes
}

export const DroppableArea: React.FC<DroppableAreaProps> = ({
	children,
	onDrop,
	dropId,
	className,
	onActiveChange,
}) => {
	const { isDragging, registerDropZone, unregisterDropZone } = useDnD();
	const dropRef = useRef<View>(null);
	const [isOver, setIsOver] = useState(false);
	const hasRegistered = useRef(false);
	const isOverRef = useRef(false); // Track hover state without causing re-renders

	// Use ref to store the latest onDrop callback to avoid re-registration
	const onDropRef = useRef(onDrop);
	const onActiveChangeRef = useRef(onActiveChange);

	useEffect(() => {
		onDropRef.current = onDrop;
	}, [onDrop]);

	useEffect(() => {
		onActiveChangeRef.current = onActiveChange;
	}, [onActiveChange]);

	// Wrapper for setIsOver that uses ref to prevent excessive re-renders
	const handleSetIsOver = useCallback((value: boolean) => {
		// Only update if the value actually changed
		if (isOverRef.current !== value) {
			isOverRef.current = value;
			setIsOver(value);

			// Call the parent callback
			if (onActiveChangeRef.current) {
				onActiveChangeRef.current(value);
			}
		}
	}, []);

	// Register drop zone when dragging starts (only once)
	useEffect(() => {
		if (isDragging && dropRef.current && !hasRegistered.current) {
			dropRef.current.measureInWindow((x, y, width, height) => {
				const layout = { x, y, width, height };
				hasRegistered.current = true;

				const handleDrop = (draggedData: any) => {
					if (onDropRef.current) {
						onDropRef.current(draggedData);
					}
				};

				registerDropZone(dropId, layout, handleDrop, handleSetIsOver);
			});
		} else if (!isDragging && hasRegistered.current) {
			unregisterDropZone(dropId);
			hasRegistered.current = false;
			isOverRef.current = false; // Reset ref when unregistering
		}
	}, [
		isDragging,
		dropId,
		registerDropZone,
		unregisterDropZone,
		handleSetIsOver,
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (hasRegistered.current) {
				unregisterDropZone(dropId);
			}
		};
	}, [dropId, unregisterDropZone]);

	return (
		<View ref={dropRef} style={styles.container}>
			{children}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
	},
});
