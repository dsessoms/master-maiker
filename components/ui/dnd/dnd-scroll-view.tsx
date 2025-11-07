import Animated, {
	runOnJS,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { Dimensions, ViewStyle } from "react-native";
import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

import { useDnD } from "@/components/ui/dnd/dnd-context";

interface DnDScrollViewProps {
	children: React.ReactNode;
	contentContainerStyle?: ViewStyle;
	style?: ViewStyle;
	scrollThreshold?: number; // Distance from edge to trigger auto-scroll
	scrollSpeed?: number; // Pixels per frame to scroll
}

export interface DnDScrollViewRef {
	scrollTo: (options: { y: number; animated?: boolean }) => void;
}

export const DnDScrollView = forwardRef<DnDScrollViewRef, DnDScrollViewProps>(
	(
		{
			children,
			contentContainerStyle,
			style,
			scrollThreshold = 150,
			scrollSpeed = 5,
		},
		ref,
	) => {
		const {
			registerDragMoveCallback,
			unregisterDragMoveCallback,
			registerDragEndCallback,
			unregisterDragEndCallback,
			setScrollOffset,
		} = useDnD();

		const scrollViewRef = useRef<Animated.ScrollView>(null);
		const scrollY = useSharedValue(0);
		const isAutoScrolling = useRef(false);
		const [scrollEnabled, setScrollEnabled] = useState(true);
		const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(
			null,
		);
		const screenHeight = Dimensions.get("window").height;

		// Expose scrollTo method to parent
		useImperativeHandle(ref, () => ({
			scrollTo: (options: { y: number; animated?: boolean }) => {
				scrollViewRef.current?.scrollTo(options);
			},
		}));

		// Auto-scroll functionality
		const startAutoScroll = useCallback(
			(direction: "up" | "down") => {
				if (isAutoScrolling.current) return;

				isAutoScrolling.current = true;
				const speed = direction === "down" ? scrollSpeed : -scrollSpeed;

				autoScrollInterval.current = setInterval(() => {
					const newScrollY = scrollY.value + speed;
					scrollY.value = newScrollY;
					scrollViewRef.current?.scrollTo({
						y: newScrollY,
						animated: false,
					});
				}, 16); // ~60fps
			},
			[scrollY, scrollSpeed],
		);

		const stopAutoScroll = useCallback(() => {
			if (autoScrollInterval.current) {
				clearInterval(autoScrollInterval.current);
				autoScrollInterval.current = null;
			}
			isAutoScrolling.current = false;
		}, []);

		const handleDragMove = useCallback(
			(absoluteY: number) => {
				setScrollEnabled(false);

				// Check if near top
				if (absoluteY < scrollThreshold) {
					startAutoScroll("up");
				}
				// Check if near bottom
				else if (absoluteY > screenHeight - scrollThreshold) {
					startAutoScroll("down");
				}
				// Stop auto-scroll if not near edges
				else {
					stopAutoScroll();
				}
			},
			[startAutoScroll, stopAutoScroll, screenHeight, scrollThreshold],
		);

		const handleDragEnd = useCallback(() => {
			setScrollEnabled(true);
			stopAutoScroll();
		}, [stopAutoScroll]);

		// Register the drag callbacks with the DnD context
		useEffect(() => {
			registerDragMoveCallback(handleDragMove);
			registerDragEndCallback(handleDragEnd);
			return () => {
				unregisterDragMoveCallback();
				unregisterDragEndCallback();
				handleDragEnd();
			};
		}, [
			registerDragMoveCallback,
			unregisterDragMoveCallback,
			registerDragEndCallback,
			unregisterDragEndCallback,
			handleDragMove,
			handleDragEnd,
		]);

		const scrollHandler = useAnimatedScrollHandler({
			onScroll: (event) => {
				scrollY.value = event.contentOffset.y;
				// Always update scroll offset - the context will handle it appropriately
				runOnJS(setScrollOffset)(event.contentOffset.y);
			},
		});

		useEffect(() => {
			return () => {
				stopAutoScroll();
			};
		}, [stopAutoScroll]);

		return (
			<Animated.ScrollView
				ref={scrollViewRef}
				onScroll={scrollHandler}
				scrollEventThrottle={16}
				scrollEnabled={scrollEnabled}
				contentContainerStyle={contentContainerStyle}
				style={style}
			>
				{children}
			</Animated.ScrollView>
		);
	},
);

DnDScrollView.displayName = "DnDScrollView";
