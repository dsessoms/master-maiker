import { ConsolidatedItemType } from "@/components/shopping/types";
import { ListItem } from "@/components/shopping/list-item";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

export const GroupedItemsList = ({
	groups,
	listId,
	onItemClick,
}: {
	groups: {
		key: string;
		name: string;
		items: ConsolidatedItemType[];
	}[];
	listId: string;
	onItemClick: (item: ConsolidatedItemType) => void;
}) => {
	return (
		<View className="gap-4">
			{groups.map((group) => (
				<View key={group.key} className="gap-2">
					<Text className="text-lg font-semibold px-1">{group.name}</Text>
					<View className="gap-2">
						{group.items.map((item) => (
							<ListItem
								key={item.id}
								item={item}
								listId={listId}
								onClick={() => onItemClick(item)}
							/>
						))}
					</View>
				</View>
			))}
		</View>
	);
};
