import { ProfileForm } from "@/components/forms/ProfileForm";
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

export default function CreateProfile() {
	const router = useRouter();

	const handleSuccess = () => {
		router.back();
	};

	const handleCancel = () => {
		router.back();
	};

	return (
		<View className="flex-1 bg-background">
			<ProfileForm onSuccess={handleSuccess} onCancel={handleCancel} />
		</View>
	);
}
