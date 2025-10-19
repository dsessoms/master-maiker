import { Plus, User } from "@/lib/icons";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";

export default function HouseholdMembers() {
	const { colorScheme } = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#ffffff" : "#000000";

	// Dummy data for household members
	const householdMembers = [
		{ id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
		{ id: 2, name: "Jane Doe", email: "jane@example.com", role: "Member" },
	];

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 gap-y-6">
				{/* Description */}
				<Muted>Manage household members</Muted>

				{/* Add Member Button */}
				<Button
					variant="outline"
					className="w-full"
					onPress={() => {
						// TODO: Navigate to add member form
						console.log("Add member pressed");
					}}
				>
					<View className="flex-row items-center gap-x-2">
						<Plus size={16} color={iconColor} />
						<Text>Add Household Member</Text>
					</View>
				</Button>

				{/* Members List */}
				<View>
					<Text className="text-base font-semibold mb-3">Current Members</Text>
					<View className="gap-y-3">
						{householdMembers.map((member) => (
							<Card key={member.id} className="p-4">
								<View className="flex-row items-center gap-x-3">
									<View className="w-10 h-10 bg-primary rounded-full items-center justify-center">
										<User size={16} color="white" />
									</View>
									<View className="flex-1">
										<Text className="font-medium">{member.name}</Text>
										<Muted className="text-sm">{member.email}</Muted>
									</View>
									<View className="items-end">
										<Text className="text-sm font-medium text-primary">
											{member.role}
										</Text>
									</View>
								</View>
							</Card>
						))}
					</View>
				</View>

				{/* Coming Soon Notice */}
				<Card className="p-4 bg-muted/50">
					<Text className="text-center font-medium text-muted-foreground">
						🚧 Coming Soon
					</Text>
					<Muted className="text-center mt-1">
						Full household member management features are currently in
						development.
					</Muted>
				</Card>
			</View>
		</ScrollView>
	);
}
