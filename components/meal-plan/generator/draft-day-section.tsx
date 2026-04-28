import type { SlotKey } from "@/lib/schemas/meal-plans/generate/draft-schema";
import { format, isToday } from "date-fns";

import type { ActiveDraft } from "./types";
import { Dot } from "@/lib/icons";
import { DraftMealSection } from "./draft-meal-section";
import { MealTypes } from "@/lib/schemas/meal-plans/generate/draft-schema";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

interface DraftDaySectionProps {
	date: Date;
	draft: ActiveDraft;
	onToggleLock?: (slotKey: string, draftEntryId: string) => void;
}

export function DraftDaySection({
	date,
	draft,
	onToggleLock,
}: DraftDaySectionProps) {
	const dateString = format(date, "yyyy-MM-dd");
	const isCurrentDay = isToday(date);

	return (
		<View>
			<View className="mb-4 mt-8">
				<View className="flex flex-row items-center gap-2">
					<View className="relative flex flex-row items-center">
						<Text className="text-2xl">{format(date, "EEEE")}</Text>
						{isCurrentDay && (
							<Dot size={40} className="absolute top-[-16] right-[-24]" />
						)}
					</View>
					<View className="px-2 py-0.5 rounded bg-primary/10">
						<Text className="text-xs font-semibold text-primary">DRAFT</Text>
					</View>
				</View>
			</View>
			<View>
				{MealTypes.map((mealType) => {
					const slotKey: SlotKey = `${dateString}.${mealType}`;
					const slot = draft.slots[slotKey];
					return (
						<DraftMealSection
							key={slotKey}
							slotKey={slotKey}
							mealType={mealType}
							slot={slot}
							onToggleLock={onToggleLock}
						/>
					);
				})}
			</View>
		</View>
	);
}
