import * as ImagePicker from "expo-image-picker";

import { Alert, TouchableOpacity, View } from "react-native";
import { CameraIcon, Trash2Icon } from "@/lib/icons";

import { Image } from "@/components/image";
import { Text } from "@/components/ui/text";

export interface ImageUploaderProps {
	selectedImageUri?: string;
	onImageSelected: (imageData?: { file: File; uri: string } | string) => void;
	variant?: "rectangular" | "circular";
	size?: number;
}

export function ImageUploader({
	selectedImageUri,
	onImageSelected,
	variant = "rectangular",
	size = 120,
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
			aspect: variant === "circular" ? [1, 1] : [4, 3],
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
			aspect: variant === "circular" ? [1, 1] : [4, 3],
			quality: 0.8,
		});

		if (!result.canceled) {
			onImageSelected(result.assets[0].uri);
		}
	};

	const showImageOptions = () => {
		const title =
			variant === "circular" ? "Select Profile Photo" : "Select Image";
		Alert.alert(title, "Choose an option", [
			{ text: "Camera", onPress: takePhoto },
			{ text: "Photo Library", onPress: pickImage },
			{ text: "Cancel", style: "cancel" },
		]);
	};

	if (variant === "circular") {
		if (selectedImageUri) {
			return (
				<View className="items-center">
					<View
						className="relative rounded-full border-2 border-border"
						style={{ width: size, height: size }}
					>
						<View
							className="overflow-hidden rounded-full"
							style={{ width: size, height: size }}
						>
							<Image
								source={{ uri: selectedImageUri }}
								className="h-full w-full"
								contentFit="cover"
							/>
						</View>
						<TouchableOpacity
							onPress={() => onImageSelected(undefined)}
							className="absolute -bottom-1 -right-1 rounded-full bg-destructive p-1.5 border-2 border-background"
						>
							<Trash2Icon className="h-3 w-3 text-destructive-foreground" />
						</TouchableOpacity>
					</View>
					<Text className="text-xs text-muted-foreground mt-2">
						Tap to change photo
					</Text>
				</View>
			);
		}

		return (
			<View className="items-center">
				<TouchableOpacity
					onPress={showImageOptions}
					className="flex items-center justify-center rounded-full border-2 border-dashed border-border bg-muted"
					style={{ width: size, height: size }}
				>
					<CameraIcon className="h-6 w-6 text-primary mb-1" />
					<Text className="text-xs text-muted-foreground text-center px-2">
						Add Photo
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// Rectangular variant (original behavior)
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
