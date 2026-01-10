import { Alert, ScrollView, View } from "react-native";
import { PencilIcon, Plus, Trash2Icon, User } from "@/lib/icons";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteProfileDialog } from "@/components/profile/delete-profile-dialog";
import { Image } from "@/components/image";
import { Muted } from "@/components/ui/typography";
import { Profile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { useDeleteProfile } from "@/hooks/profiles/useDeleteProfile";
import { useProfiles } from "@/hooks/profiles/useProfiles";
import { useRouter } from "expo-router";
import { useState } from "react";

function ProfileSkeleton() {
	return (
		<Card className="p-4">
			<View className="flex-row items-center gap-x-3">
				<Skeleton className="w-10 h-10 rounded-full" />
				<View className="flex-1">
					<Skeleton className="h-4 w-24 mb-1" />
				</View>
				<View className="items-end">
					<Skeleton className="h-3 w-12 mb-2" />
					<View className="flex-row gap-x-2">
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
					</View>
				</View>
			</View>
		</Card>
	);
}

export default function Profiles() {
	const { colorScheme } = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#ffffff" : "#000000";
	const router = useRouter();

	const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

	const { profiles, isLoading, error } = useProfiles();
	const deleteProfile = useDeleteProfile();

	const handleEdit = (profile: Profile) => {
		router.push({
			pathname: "/account/profiles/[id]/edit",
			params: { id: profile.id },
		});
	};

	const handleCreate = () => {
		router.push("/account/profiles/create");
	};

	const handleDelete = (profile: Profile) => {
		if (profile.is_primary) {
			Alert.alert(
				"Cannot Delete Primary Profile",
				"Primary profiles cannot be deleted. Please set another profile as primary first.",
				[{ text: "OK" }],
			);
			return;
		}

		setProfileToDelete(profile);
	};

	const confirmDeleteProfile = async () => {
		if (!profileToDelete) return;

		try {
			await deleteProfile.mutateAsync(profileToDelete.id);
			setProfileToDelete(null);
		} catch (error) {
			console.error("Error deleting profile:", error);
			// You could show another dialog or toast for error handling here
		}
	};

	const cancelDeleteProfile = () => {
		setProfileToDelete(null);
	};

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 w-full max-w-3xl mx-auto gap-y-6">
				<Muted>Manage profiles and their dietary preferences</Muted>

				<View>
					<Text className="text-base font-semibold mb-3">Profiles</Text>

					{isLoading ? (
						<View className="gap-y-3">
							<ProfileSkeleton />
							<ProfileSkeleton />
							<ProfileSkeleton />
						</View>
					) : error ? (
						<Card className="p-4 bg-destructive/10">
							<Text className="text-center text-destructive">
								Failed to load profiles
							</Text>
						</Card>
					) : profiles && profiles.length > 0 ? (
						<View className="gap-y-3">
							{profiles.map((profile) => (
								<Card key={profile.id} className="p-4">
									<View className="flex-row items-center gap-x-3">
										{profile.avatar_url ? (
											<Image
												source={{ uri: profile.avatar_url }}
												className="w-10 h-10 rounded-full"
												contentFit="cover"
											/>
										) : (
											<View className="w-10 h-10 bg-primary rounded-full items-center justify-center">
												<User size={16} color="white" />
											</View>
										)}
										<View className="flex-1">
											<Text className="font-medium">{profile.name}</Text>
										</View>
										<View className="items-end">
											<Text className="text-sm font-medium text-primary">
												{profile.is_primary ? "Primary" : "Member"}
											</Text>

											{/* Action Buttons */}
											<View className="flex-row gap-x-2 mt-2">
												<Button
													variant="outline"
													size="sm"
													onPress={() => handleEdit(profile)}
												>
													<PencilIcon size={14} color={iconColor} />
												</Button>

												{!profile.is_primary && (
													<Button
														variant="outline"
														size="sm"
														onPress={() => handleDelete(profile)}
													>
														<Trash2Icon size={14} color={iconColor} />
													</Button>
												)}
											</View>
										</View>
									</View>
								</Card>
							))}
						</View>
					) : (
						<Card className="p-4">
							<Text className="text-center text-muted-foreground">
								No profiles found
							</Text>
						</Card>
					)}
				</View>

				<Button variant="outline" className="w-full" onPress={handleCreate}>
					<View className="flex-row items-center gap-x-2">
						<Plus size={16} color={iconColor} />
						<Text>Add New Profile</Text>
					</View>
				</Button>
			</View>

			{/* Delete Profile Dialog */}
			<DeleteProfileDialog
				open={!!profileToDelete}
				onOpenChange={(open) => !open && setProfileToDelete(null)}
				onConfirm={confirmDeleteProfile}
				onCancel={cancelDeleteProfile}
				isDeleting={deleteProfile.isPending}
				profileName={profileToDelete?.name}
			/>
		</ScrollView>
	);
}
