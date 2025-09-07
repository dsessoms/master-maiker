import { Image } from "@/components/image";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "@/lib/icons";
import { toHoursAndMinutes } from "@/lib/utils/to-hours-and-minutes";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TouchableOpacity, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";

type Recipe = {
	id: string;
	name: string;
	description?: string;
	image_id?: string;
	prep_time_hours?: number;
	prep_time_minutes?: number;
	cook_time_hours?: number;
	cook_time_minutes?: number;
	macros?: Array<{
		calories?: number;
		protein?: number;
	}>;
};

export const RecipeCard = ({
	recipe,
	onEdit,
	onDelete,
}: {
	recipe: Recipe;
	onEdit: () => void;
	onDelete: () => void;
}) => {
	const router = useRouter();
	const { id, image_id, name, description } = recipe;

	const totalMinutes =
		Number(recipe.cook_time_hours ?? 0) * 60 +
		Number(recipe.prep_time_hours ?? 0) * 60 +
		Number(recipe.cook_time_minutes ?? 0) +
		Number(recipe.prep_time_minutes ?? 0);
	const { hours, minutes } = toHoursAndMinutes(totalMinutes);

	const handlePress = () => {
		router.push({
			pathname: "/recipes/[id]",
			params: { id },
		});
	};

	const handleEditPress = (e: any) => {
		e.stopPropagation();
		onEdit();
	};

	const handleDeletePress = (e: any) => {
		e.stopPropagation();
		onDelete();
	};

	return (
		<TouchableOpacity
			onPress={handlePress}
			className="flex flex-col bg-card border border-border rounded-lg overflow-hidden active:bg-muted"
		>
			<View className="relative">
				{image_id ? (
					<Image
						source={{ uri: image_id }}
						className="h-48 w-full"
						contentFit="cover"
					/>
				) : (
					<View className="h-48 w-full bg-muted flex items-center justify-center overflow-hidden">
						<Text className="text-6xl font-bold text-muted-foreground opacity-20">
							{name.toUpperCase()}
						</Text>
					</View>
				)}

				<View className="absolute top-2 right-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border-border/50"
								onPress={(e) => e.stopPropagation()}
							>
								<MoreHorizontalIcon className="text-foreground" size={16} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent side="bottom" align="end" className="w-32">
							<DropdownMenuItem onPress={handleEditPress}>
								<PencilIcon className="text-foreground mr-2" size={16} />
								<Text>Edit</Text>
							</DropdownMenuItem>
							<DropdownMenuItem onPress={handleDeletePress}>
								<Trash2Icon className="text-destructive mr-2" size={16} />
								<Text className="text-destructive">Delete</Text>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</View>
			</View>

			<View className="flex flex-1 flex-col p-4">
				<Text className="text-lg font-semibold mb-1 line-clamp-1">{name}</Text>
				{description && (
					<Text className="text-sm text-muted-foreground mb-2 line-clamp-1">
						{description}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
};
