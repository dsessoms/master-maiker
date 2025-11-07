import Animated, {
	runOnJS,
	useAnimatedReaction,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withSpring,
	type SharedValue,
} from "react-native-reanimated";
import React, {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react";
import { StyleSheet, View } from "react-native";

interface DragPosition {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface DropZone {
	id: string;
	layout: DragPosition;
	onDrop: (draggedData: any) => void;
	setIsOver: (isOver: boolean) => void;
}

interface DnDContextType {
	isDragging: boolean;
	draggedItem: ReactNode | null;
	draggedData: any;
	startDrag: (item: ReactNode, position: DragPosition, data?: any) => void;
	updateDragPosition: (x: number, y: number) => void;
	endDrag: () => void;
	onDragMove?: (absoluteY: number) => void;
	registerDragMoveCallback: (callback: (absoluteY: number) => void) => void;
	unregisterDragMoveCallback: () => void;
	registerDragEndCallback: (callback: () => void) => void;
	unregisterDragEndCallback: () => void;
	registerDropZone: (
		id: string,
		layout: DragPosition,
		onDrop: (draggedData: any) => void,
		setIsOver: (isOver: boolean) => void,
	) => void;
	unregisterDropZone: (id: string) => void;
	setScrollOffset: (offset: number) => void;
}

const DnDContext = createContext<DnDContextType | undefined>(undefined);

export const useDnD = () => {
	const context = useContext(DnDContext);
	if (!context) {
		throw new Error("useDnD must be used within a DnDProvider");
	}
	return context;
};

interface DnDProviderProps {
	children: ReactNode;
}

export const DnDProvider: React.FC<DnDProviderProps> = ({ children }) => {
	const [isDragging, setIsDragging] = useState(false);
	const [draggedItem, setDraggedItem] = useState<ReactNode | null>(null);
	const [draggedData, setDraggedData] = useState<any>(null);
	const [dragMoveCallback, setDragMoveCallback] = useState<
		((absoluteY: number) => void) | undefined
	>();
	const [dragEndCallback, setDragEndCallback] = useState<
		(() => void) | undefined
	>();
	const dropZonesRef = useRef<Map<string, DropZone>>(new Map()); // Changed to ref
	const currentDropZoneRef = useRef<string | null>(null); // Changed to ref to prevent re-renders
	const [scrollOffset, setScrollOffset] = useState(0);
	const [initialScrollOffset, setInitialScrollOffset] = useState(0);

	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const scale = useSharedValue(1);
	const opacity = useSharedValue(1);
	const startX = useSharedValue(0);
	const startY = useSharedValue(0);
	const width = useSharedValue(0);
	const height = useSharedValue(0);

	const startDrag = useCallback(
		(item: ReactNode, position: DragPosition, data?: any) => {
			setIsDragging(true);
			setDraggedItem(item);
			setDraggedData(data || null);
			setInitialScrollOffset(scrollOffset); // Capture scroll position when drag starts

			startX.value = position.x;
			startY.value = position.y;
			width.value = position.width;
			height.value = position.height;
			translateX.value = 0;
			translateY.value = 0;
			scale.value = withSpring(1.05);
			opacity.value = withSpring(0.9);
		},
		[scrollOffset],
	);

	// JS function to check collision detection (called from worklet)
	const checkCollisionDetection = useCallback(
		(draggedCenterX: number, draggedCenterY: number, absoluteY: number) => {
			// Adjust for scroll offset: drop zones were measured at initialScrollOffset,
			// so we adjust their Y position based on how much we've scrolled since then
			const scrollDelta = scrollOffset - initialScrollOffset;

			// Check which drop zone (if any) the item is over
			let foundDropZone: string | null = null;
			dropZonesRef.current.forEach((zone, id) => {
				// Adjust zone Y position for scroll
				const adjustedZoneY = zone.layout.y - scrollDelta;

				// Check if the center of the dragged item is inside the drop zone
				const isOver =
					draggedCenterX >= zone.layout.x &&
					draggedCenterX <= zone.layout.x + zone.layout.width &&
					draggedCenterY >= adjustedZoneY &&
					draggedCenterY <= adjustedZoneY + zone.layout.height;

				if (isOver) {
					foundDropZone = id;
				}
			});

			// Only update zones if the current drop zone changed
			if (foundDropZone !== currentDropZoneRef.current) {
				// Clear the previous zone
				if (
					currentDropZoneRef.current &&
					dropZonesRef.current.has(currentDropZoneRef.current)
				) {
					dropZonesRef.current
						.get(currentDropZoneRef.current)!
						.setIsOver(false);
				}

				// Set the new zone
				if (foundDropZone && dropZonesRef.current.has(foundDropZone)) {
					dropZonesRef.current.get(foundDropZone)!.setIsOver(true);
				}

				currentDropZoneRef.current = foundDropZone;
			}

			// Call auto-scroll callback (using top position for auto-scroll detection)
			if (dragMoveCallback) {
				dragMoveCallback(absoluteY);
			}
		},
		[dragMoveCallback, scrollOffset, initialScrollOffset],
	);

	const updateDragPosition = useCallback(
		(x: number, y: number) => {
			"worklet";
			translateX.value = x;
			translateY.value = y;

			// Calculate absolute position of dragged item's center
			const draggedCenterX = startX.value + translateX.value + width.value / 2;
			const draggedCenterY = startY.value + translateY.value + height.value / 2;
			const absoluteY = startY.value + translateY.value;

			// Run collision detection on JS thread
			runOnJS(checkCollisionDetection)(
				draggedCenterX,
				draggedCenterY,
				absoluteY,
			);
		},
		[checkCollisionDetection],
	);

	const endDrag = useCallback(() => {
		// If dropped on a valid zone, trigger the drop callback
		if (
			currentDropZoneRef.current &&
			dropZonesRef.current.has(currentDropZoneRef.current)
		) {
			const zone = dropZonesRef.current.get(currentDropZoneRef.current)!;
			zone.onDrop(draggedData);
			zone.setIsOver(false);
		}

		// Reset all drop zone states
		dropZonesRef.current.forEach((zone) => {
			zone.setIsOver(false);
		});

		currentDropZoneRef.current = null;

		// Call the drag end callback if registered
		if (dragEndCallback) {
			dragEndCallback();
		}

		setIsDragging(false);
		setDraggedItem(null);
		setDraggedData(null);
	}, [dragEndCallback, draggedData]);

	const registerDragMoveCallback = useCallback(
		(callback: (absoluteY: number) => void) => {
			setDragMoveCallback(() => callback);
		},
		[],
	);

	const unregisterDragMoveCallback = useCallback(() => {
		setDragMoveCallback(undefined);
	}, []);

	const registerDragEndCallback = useCallback((callback: () => void) => {
		setDragEndCallback(() => callback);
	}, []);

	const unregisterDragEndCallback = useCallback(() => {
		setDragEndCallback(undefined);
	}, []);

	const registerDropZone = useCallback(
		(
			id: string,
			layout: DragPosition,
			onDrop: (draggedData: any) => void,
			setIsOver: (isOver: boolean) => void,
		) => {
			dropZonesRef.current.set(id, { id, layout, onDrop, setIsOver });
		},
		[],
	);

	const unregisterDropZone = useCallback((id: string) => {
		dropZonesRef.current.delete(id);
	}, []);

	return (
		<DnDContext.Provider
			value={{
				isDragging,
				draggedItem,
				draggedData,
				startDrag,
				updateDragPosition,
				endDrag,
				registerDragMoveCallback,
				unregisterDragMoveCallback,
				registerDragEndCallback,
				unregisterDragEndCallback,
				registerDropZone,
				unregisterDropZone,
				setScrollOffset,
			}}
		>
			{children}
			{/* Portal layer for dragged item - key prevents recreation */}
			{isDragging && draggedItem && (
				<DragOverlay
					key="drag-overlay"
					startX={startX}
					startY={startY}
					width={width}
					translateX={translateX}
					translateY={translateY}
					scale={scale}
					opacity={opacity}
				>
					{draggedItem}
				</DragOverlay>
			)}
		</DnDContext.Provider>
	);
};

// Separate component for drag overlay to isolate useAnimatedStyle
// This component should not re-render when parent state changes
const DragOverlay = React.memo<{
	children: ReactNode;
	startX: SharedValue<number>;
	startY: SharedValue<number>;
	width: SharedValue<number>;
	translateX: SharedValue<number>;
	translateY: SharedValue<number>;
	scale: SharedValue<number>;
	opacity: SharedValue<number>;
}>(
	function DragOverlay({
		children,
		startX,
		startY,
		width,
		translateX,
		translateY,
		scale,
		opacity,
	}) {
		// Note: Reanimated may warn about reading .value during render, but this is safe
		// because the actual reads happen in the worklet on the UI thread, not during React render.
		// The warning is triggered by React evaluating the hook, but execution is deferred.
		const dragOverlayStyle = useAnimatedStyle(() => {
			return {
				position: "absolute" as const,
				top: startY.value,
				left: startX.value,
				width: width.value,
				transform: [
					{ translateX: translateX.value },
					{ translateY: translateY.value },
					{ scale: scale.value },
				],
				opacity: opacity.value,
				zIndex: 10000,
				elevation: 10000,
			};
		});

		return (
			<Animated.View style={dragOverlayStyle} pointerEvents="none">
				{children}
			</Animated.View>
		);
	},
	// Custom comparison - only re-render if children change (SharedValues are stable)
	(prevProps, nextProps) => prevProps.children === nextProps.children,
);
