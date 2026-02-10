import { ChevronDown, Plus, Star } from "lucide-react-native";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { router } from "expo-router";

export const ShoppingListSelector = ({
	currentListId,
	lists,
	onCreateNew,
}: {
	currentListId: string;
	lists:
		| Array<{ id: string; name: string; is_default: boolean | null }>
		| undefined;
	onCreateNew: () => void;
}) => {
	const currentList = lists?.find((list) => list.id === currentListId);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="secondary" className="flex-row items-center gap-2">
					<Text className="text-lg font-bold">
						{currentList?.name || "Shopping List"}
					</Text>
					<ChevronDown className="h-5 w-5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{lists?.map((list) => (
					<DropdownMenuItem
						key={list.id}
						onPress={() => {
							if (list.id !== currentListId) {
								router.push(`/(tabs)/shopping/${list.id}` as any);
							}
						}}
					>
						<View className="flex-row items-center gap-2">
							<Text className={list.id === currentListId ? "font-bold" : ""}>
								{list.name}
							</Text>
							{list.is_default && (
								<Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
							)}
						</View>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem onPress={onCreateNew}>
					<Plus className="mr-2 h-4 w-4" />
					<Text>Create New List</Text>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
