import * as ImagePicker from "expo-image-picker";

import { Alert, TouchableOpacity, View } from "react-native";
import { CameraIcon, Trash2Icon } from "@/lib/icons";

import { Image } from "@/components/image";
import { Text } from "@/components/ui/text";

export interface ImageUploaderProps {
	selectedImageUri?: string;
	onImageSelected: (imageData?: { file: File; uri: string } | string) => void;
}

export function ImageUploader({
	selectedImageUri,
	onImageSelected,
}: ImageUploaderProps) {
	const requestPermissions = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission needed",
				"Sorry, we need camera roll permissions to select images.",
			);
			return false;
		}
		return true;
	};

	const pickImage = async () => {
		const hasPermission = await requestPermissions();
		if (!hasPermission) return;

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.8,
		});

		if (!result.canceled) {
			onImageSelected(result.assets[0].uri);
		}
	};

	const takePhoto = async () => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission needed",
				"Sorry, we need camera permissions to take photos.",
			);
			return;
		}

		const result = await ImagePicker.launchCameraAsync({
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.8,
		});

		if (!result.canceled) {
			onImageSelected(result.assets[0].uri);
		}
	};

	const showImageOptions = () => {
		Alert.alert("Select Image", "Choose an option", [
			{ text: "Camera", onPress: takePhoto },
			{ text: "Photo Library", onPress: pickImage },
			{ text: "Cancel", style: "cancel" },
		]);
	};

	if (selectedImageUri) {
		return (
			<View className="relative h-44 w-full overflow-hidden rounded-md border border-border">
				<Image
					source={{ uri: selectedImageUri }}
					className="h-full w-full"
					contentFit="cover"
				/>
				<TouchableOpacity
					onPress={() => onImageSelected(undefined)}
					className="absolute bottom-2 left-2 rounded-full bg-destructive p-2"
				>
					<Trash2Icon className="h-4 w-4 text-destructive-foreground" />
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<TouchableOpacity
			onPress={showImageOptions}
			className="flex h-44 w-full flex-col items-center justify-center rounded-md border border-border bg-muted"
		>
			<CameraIcon className="h-6 w-6 text-primary mb-2" />
			<Text className="text-muted-foreground">Add Photo</Text>
		</TouchableOpacity>
	);
}
