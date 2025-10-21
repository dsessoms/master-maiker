import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Card } from "@/components/ui/card";
import { Database } from "@/database.types";
import { ProfileForm } from "@/components/forms/ProfileForm";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfiles } from "@/hooks/profiles/useProfiles";

type Profile = Database["public"]["Tables"]["profile"]["Row"];

export default function ProfileFormPage() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { profiles, isLoading } = useProfiles();

	// Find the profile we're editing
	const profile = profiles?.find((p) => p.id === id);

	const handleSuccess = () => {
		router.back();
	};

	const handleCancel = () => {
		router.back();
	};

	// Show loading skeleton while profiles are loading
	if (isLoading) {
		return (
			<ScrollView
				className="bg-background"
				keyboardShouldPersistTaps="handled"
				contentContainerClassName="items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
				keyboardDismissMode="interactive"
			>
				<Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5 p-4 w-full max-w-xl">
					<View className="gap-y-4">
						{/* Avatar Section */}
						<View className="items-center">
							<Skeleton className="w-24 h-24 rounded-full" />
						</View>

						{/* Basic Information */}
						<View className="gap-y-3 w-full">
							<Skeleton className="h-5 w-full" />

							<View className="gap-y-2">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-10 w-full" />
							</View>

							<View className="gap-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</View>

							<View className="gap-y-2">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-10 w-full" />
							</View>
						</View>

						{/* Physical Stats */}
						<View className="gap-y-3">
							<Skeleton className="h-5 w-28" />

							<View className="gap-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full" />
							</View>

							<View className="gap-y-2">
								<Skeleton className="h-4 w-16" />
								<View className="flex-row gap-x-2">
									<Skeleton className="h-10 flex-1" />
									<Skeleton className="h-10 flex-1" />
								</View>
							</View>

							<View className="gap-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
							</View>
						</View>

						{/* Nutrition Goals */}
						<View className="gap-y-3">
							<Skeleton className="h-5 w-32" />

							<View className="gap-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
							</View>

							<View className="gap-y-2">
								<Skeleton className="h-4 w-36" />
								<Skeleton className="h-10 w-full" />
							</View>

							<View className="flex-row gap-x-4">
								<View className="flex-1 gap-y-2">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-10 w-full" />
								</View>
								<View className="flex-1 gap-y-2">
									<Skeleton className="h-4 w-12" />
									<Skeleton className="h-10 w-full" />
								</View>
								<View className="flex-1 gap-y-2">
									<Skeleton className="h-4 w-8" />
									<Skeleton className="h-10 w-full" />
								</View>
							</View>
						</View>

						{/* Food Preferences */}
						<View className="gap-y-3">
							<Skeleton className="h-5 w-36" />

							<View className="gap-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-20 w-full" />
							</View>

							<View className="gap-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-20 w-full" />
							</View>
						</View>

						{/* Action Buttons */}
						<View className="flex-row gap-x-3 mt-4">
							<Skeleton className="h-10 flex-1" />
							<Skeleton className="h-10 flex-1" />
						</View>
					</View>
				</Card>
			</ScrollView>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<ProfileForm
				profile={profile}
				onSuccess={handleSuccess}
				onCancel={handleCancel}
			/>
		</View>
	);
}
