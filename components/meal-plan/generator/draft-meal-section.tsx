import type {
	DraftSlot,
	MealType,
} from "@/lib/schemas/meal-plans/generate/draft-schema";

import { DraftFoodEntryCard } from "./draft-food-entry-card";
import { MealTypeIcon } from "@/components/meal-plan/meal-type-icon";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

export function DraftMealSection({
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
				<Text className="text-lg font-semibold text-muted-foreground mb-2">
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
