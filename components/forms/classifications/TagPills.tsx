import { ChevronDown, ChevronUp, X } from "@/lib/icons";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Pressable, TextInput, View } from "react-native";
import { useMemo, useState } from "react";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export interface TagItem {
	id: number;
	name: string;
}

interface TagPillsProps {
	existingTags: TagItem[];
	selectedTagNames: string[];
	onSelectionChange: (tagNames: string[]) => void;
	label: string;
	isLoading?: boolean;
}

export function TagPills({
	existingTags,
	selectedTagNames,
	onSelectionChange,
	label,
	isLoading,
}: TagPillsProps) {
	const [newTagInput, setNewTagInput] = useState("");
	const [isOpen, setIsOpen] = useState(false);

	const toggleTag = (tagName: string) => {
		if (selectedTagNames.includes(tagName)) {
			onSelectionChange(selectedTagNames.filter((name) => name !== tagName));
		} else {
			onSelectionChange([...selectedTagNames, tagName]);
		}
	};

	const addNewTag = () => {
		const trimmedTag = newTagInput.trim().toLowerCase();
		if (trimmedTag && !selectedTagNames.includes(trimmedTag)) {
			onSelectionChange([...selectedTagNames, trimmedTag]);
			setNewTagInput("");
		}
	};

	const removeTag = (tagName: string) => {
		onSelectionChange(selectedTagNames.filter((name) => name !== tagName));
	};

	// Filter out selected tags and sort remaining: selected-related first
	const unselectedTags = useMemo(() => {
		return existingTags.filter((tag) => !selectedTagNames.includes(tag.name));
	}, [existingTags, selectedTagNames]);

	const visibleUnselectedTags = unselectedTags.slice(0, 4);
	const hiddenUnselectedTags = unselectedTags.slice(4);
	const hasMoreTags = hiddenUnselectedTags.length > 0;

	if (isLoading) {
		return (
			<View>
				<Text className="text-xl font-semibold mb-2">{label}</Text>
				<Text className="text-muted-foreground">Loading...</Text>
			</View>
		);
	}

	const renderUnselectedTag = (tag: TagItem) => (
		<Pressable
			key={tag.id}
			onPress={() => toggleTag(tag.name)}
			className="px-4 py-2 rounded-full border-2 border-input bg-background"
		>
			<Text className="text-sm font-medium text-foreground">{tag.name}</Text>
		</Pressable>
	);

	return (
		<View>
			<Text className="text-xl font-semibold mb-2">{label}</Text>

			{/* Selected tags */}
			{selectedTagNames.length > 0 && (
				<View className="flex-row flex-wrap gap-2 mb-3">
					{selectedTagNames.map((tagName) => (
						<View
							key={tagName}
							className="px-4 py-2 rounded-full bg-primary border-2 border-primary flex-row items-center gap-2"
						>
							<Text className="text-sm font-medium text-primary-foreground">
								{tagName}
							</Text>
							<Pressable onPress={() => removeTag(tagName)} className="ml-1">
								<X className="h-3 w-3 text-primary-foreground" />
							</Pressable>
						</View>
					))}
				</View>
			)}

			{/* Existing tags (not yet selected) with collapsible */}
			{unselectedTags.length > 0 && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<View className="flex-row flex-wrap gap-2 mb-3">
						{visibleUnselectedTags.map(renderUnselectedTag)}
					</View>

					{hasMoreTags && (
						<>
							<CollapsibleContent>
								<View className="flex-row flex-wrap gap-2 mb-3">
									{hiddenUnselectedTags.map(renderUnselectedTag)}
								</View>
							</CollapsibleContent>

							<CollapsibleTrigger asChild>
								<Pressable className="mb-3 flex-row items-center gap-1">
									<Text className="text-sm font-medium text-primary">
										{isOpen
											? "Show Less"
											: `Show ${hiddenUnselectedTags.length} More`}
									</Text>
									{isOpen ? (
										<ChevronUp className="h-4 w-4 text-primary" />
									) : (
										<ChevronDown className="h-4 w-4 text-primary" />
									)}
								</Pressable>
							</CollapsibleTrigger>
						</>
					)}
				</Collapsible>
			)}

			{/* Input for new tags */}
			<View className="flex-row gap-2 items-center">
				<View className="flex-1">
					<TextInput
						value={newTagInput}
						onChangeText={setNewTagInput}
						onSubmitEditing={addNewTag}
						placeholder="Add a new tag..."
						className={cn(
							"h-12 rounded-md border border-input bg-background px-3 text-base text-foreground",
							"placeholder:text-muted-foreground",
							"web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
						)}
						returnKeyType="done"
						autoCapitalize="none"
						autoCorrect={false}
					/>
				</View>
				<Pressable
					onPress={addNewTag}
					disabled={!newTagInput.trim()}
					className={cn(
						"px-4 py-3 rounded-md",
						newTagInput.trim() ? "bg-primary" : "bg-muted",
					)}
				>
					<Text
						className={cn(
							"text-sm font-medium",
							newTagInput.trim()
								? "text-primary-foreground"
								: "text-muted-foreground",
						)}
					>
						Add
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
