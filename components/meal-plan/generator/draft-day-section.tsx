import type { DraftSlot, MealType, SlotKey } from "@/lib/meal-plan-draft/types";
import { format, isToday } from "date-fns";

import type { ActiveDraft } from "./types";
import { Dot } from "@/lib/icons";
import { DraftFoodEntryCard } from "./draft-food-entry-card";
import { MEAL_TYPES } from "@/lib/meal-plan-draft/types";
import { MealTypeIcon } from "@/components/meal-plan/meal-type-icon";
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
				{MEAL_TYPES.map((mealType) => {
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

function DraftMealSection({
	slotKey,
	mealType,
	slot,
	onToggleLock,
}: {
	slotKey: string;
	mealType: MealType;
	slot: DraftSlot | undefined;
	onToggleLock?: (slotKey: string, draftEntryId: string) => void;
}) {
	const hasEntries = (slot?.entries?.length ?? 0) > 0;
	const hasError = (slot?.errors?.length ?? 0) > 0;

	return (
		<View className="flex flex-row w-full">
			<View className="flex flex-col items-center pr-2 pt-[6px]">
				<MealTypeIcon
					mealType={mealType}
					className="mb-1 h-4 w-4 text-muted-foreground"
				/>
				<View className="w-0.5 rounded-full flex-1 mt-1 bg-border" />
			</View>

			<View className="flex-1 pb-4">
				<Text className="text-sm font-medium text-muted-foreground mb-2">
					{mealType}
				</Text>

				{!slot || (!hasEntries && !hasError) ? (
					<View className="py-2 px-3 rounded-md border border-dashed border-border">
						<Text className="text-sm text-muted-foreground italic">
							No recipe assigned
						</Text>
					</View>
				) : hasError ? (
					<View className="py-2 px-3 rounded-md border border-destructive/40 bg-destructive/5">
						<Text className="text-sm text-destructive">
							Could not find a matching recipe
						</Text>
					</View>
				) : (
					slot.entries.map((entry) => (
						<DraftFoodEntryCard
							key={entry.draft_entry_id}
							entry={entry}
							onToggleLock={
								onToggleLock ? (id) => onToggleLock(slotKey, id) : undefined
							}
						/>
					))
				)}
			</View>
		</View>
	);
}
