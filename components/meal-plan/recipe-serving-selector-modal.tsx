import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollView, View } from "react-native";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";

type Profile = {
	id: string;
	name: string;
};

export const RecipeServingSelectorModal = ({
	open,
	onOpenChange,
	profiles,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	profiles: Profile[];
	onConfirm: (servings: { profile_id: string; servings: number }[]) => void;
}) => {
	const [servings, setServings] = useState<{ [key: string]: number }>(() => {
		const initial: { [key: string]: number } = {};
		profiles.forEach((profile) => {
			initial[profile.id] = 1;
		});
		return initial;
	});

	const handleServingsChange = (profileId: string, value: string) => {
		const numValue = parseFloat(value) || 0;
		setServings((prev) => ({
			...prev,
			[profileId]: Math.max(0, numValue),
		}));
	};

	const profileServings = useMemo(
		() =>
			profiles.map((profile) => ({
				profile_id: profile.id,
				servings: servings[profile.id] ?? 1,
			})),
		[profiles, servings],
	);

	const handleConfirm = () => {
		onConfirm(profileServings);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Select Servings per Profile</DialogTitle>
					<DialogDescription>
						Choose the number of servings for each profile
					</DialogDescription>
				</DialogHeader>
				<View className="gap-4">
					{profiles.map((profile) => (
						<View key={profile.id} className="flex flex-col gap-2">
							<Label nativeID={`servings-${profile.id}`}>{profile.name}</Label>
							<Input
								nativeID={`servings-${profile.id}`}
								placeholder="Number of servings"
								value={servings[profile.id]?.toString() ?? "1"}
								onChangeText={(value) =>
									handleServingsChange(profile.id, value)
								}
								keyboardType="decimal-pad"
							/>
						</View>
					))}
				</View>
				<DialogFooter>
					<Button
						variant="outline"
						onPress={() => onOpenChange(false)}
						className="flex-1"
					>
						<Text>Cancel</Text>
					</Button>
					<Button onPress={handleConfirm} className="flex-1">
						<Text>Confirm</Text>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
