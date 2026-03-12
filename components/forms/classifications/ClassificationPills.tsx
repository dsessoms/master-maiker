import { ChevronDown, ChevronUp } from "@/lib/icons";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Pressable, View } from "react-native";
import { useMemo, useState } from "react";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export interface PillItem {
	id: number;
	name: string;
}

interface ClassificationPillsProps {
	items: PillItem[];
	selectedIds: number[];
	onSelectionChange: (ids: number[]) => void;
	label: string;
	isLoading?: boolean;
}

export function ClassificationPills({
	items,
	selectedIds,
	onSelectionChange,
	label,
	isLoading,
}: ClassificationPillsProps) {
	const [isOpen, setIsOpen] = useState(false);

	const toggleSelection = (id: number) => {
		if (selectedIds.includes(id)) {
			onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
		} else {
			onSelectionChange([...selectedIds, id]);
		}
	};

	// Sort items: selected first, then unselected
	const sortedItems = useMemo(() => {
		return [...items].sort((a, b) => {
			const aSelected = selectedIds.includes(a.id);
			const bSelected = selectedIds.includes(b.id);
			if (aSelected && !bSelected) return -1;
			if (!aSelected && bSelected) return 1;
			return 0;
		});
	}, [items, selectedIds]);

	const visibleItems = sortedItems.slice(0, 4);
	const hiddenItems = sortedItems.slice(4);
	const hasMoreItems = hiddenItems.length > 0;

	if (isLoading) {
		return (
			<View>
				<Text className="text-xl font-semibold mb-2">{label}</Text>
				<Text className="text-muted-foreground">Loading...</Text>
			</View>
		);
	}

	const renderPill = (item: PillItem) => {
		const isSelected = selectedIds.includes(item.id);
		return (
			<Pressable
				key={item.id}
				onPress={() => toggleSelection(item.id)}
				className={cn(
					"px-4 py-2 rounded-full border-2 transition-colors",
					isSelected ? "bg-input border-input" : "bg-background border-input",
				)}
			>
				<Text
					className={cn(
						"text-sm font-medium",
						isSelected ? "text-primary-foreground" : "text-foreground",
					)}
				>
					{item.name}
				</Text>
			</Pressable>
		);
	};

	return (
		<View>
			<Text className="text-xl font-semibold mb-2">{label}</Text>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<View className="flex-row flex-wrap gap-2">
					{visibleItems.map(renderPill)}
				</View>

				{hasMoreItems && (
					<>
						<CollapsibleContent>
							<View className="flex-row flex-wrap gap-2 mt-2">
								{hiddenItems.map(renderPill)}
							</View>
						</CollapsibleContent>

						<CollapsibleTrigger asChild>
							<Pressable className="mt-3 flex-row items-center gap-1">
								<Text className="text-sm font-medium text-muted-foreground">
									{isOpen ? "Show Less" : `Show ${hiddenItems.length} More`}
								</Text>
								{isOpen ? (
									<ChevronUp className="h-4 w-4 text-muted-foreground" />
								) : (
									<ChevronDown className="h-4 w-4 text-muted-foreground" />
								)}
							</Pressable>
						</CollapsibleTrigger>
					</>
				)}
			</Collapsible>
		</View>
	);
}
