import { useWindowDimensions } from "react-native";

export const useResponsiveColumns = () => {
	const { width } = useWindowDimensions();

	// Define breakpoints
	const getColumns = () => {
		if (width >= 768) {
			// Tablet and larger - 3 columns
			return 3;
		} else if (width >= 480) {
			// Large phone - 2 columns
			return 2;
		} else {
			// Small phone - 2 columns (minimum for grid layout)
			return 2;
		}
	};

	const columns = getColumns();
	// Account for padding (32 total) and gap between cards (8px gap = gap-2)
	const totalGaps = (columns - 1) * 8; // 8px gap between columns
	const cardWidth = (width - 32 - totalGaps) / columns;

	return {
		columns,
		cardWidth,
		screenWidth: width,
	};
};
