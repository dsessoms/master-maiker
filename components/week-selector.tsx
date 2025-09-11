import { ChevronLeft, ChevronRight } from "../lib/icons";

import { Button } from "./ui/button";
import { Text } from "./ui/text";
import { View } from "react-native";
import { format } from "date-fns";

const DATE_FORMAT = "MMM d";

export const WeekSelector = ({
	startDate,
	endDate,
	onPreviousClick,
	onNextClick,
	onThisWeek,
}: {
	startDate: Date;
	endDate: Date;
	onPreviousClick: () => void;
	onNextClick: () => void;
	onThisWeek: () => void;
}) => {
	return (
		<View className="flex flex-row items-center space-x-2">
			<Button onPress={onPreviousClick} variant="ghost">
				<ChevronLeft className="h-6 w-6" />
			</Button>
			<Button onPress={onThisWeek} variant="ghost">
				<Text>
					{`${format(startDate, DATE_FORMAT)} - ${format(
						endDate,
						DATE_FORMAT,
					)}`}
				</Text>
			</Button>
			<Button onPress={onNextClick} variant="ghost">
				<ChevronRight className="h-6 w-6" />
			</Button>
		</View>
	);
};
