import { CameraIcon, Trash2Icon } from "@/lib/icons";
import React, { useRef } from "react";

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
	const inputFileRef = useRef<HTMLInputElement>(null);

	const onFileChangeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const imageUrl = URL.createObjectURL(file);
			onImageSelected({ file, uri: imageUrl });
		}
	};

	const handleAddPhoto = () => {
		inputFileRef.current?.click();
	};

	const handleRemovePhoto = () => {
		onImageSelected(undefined);
		// Reset the input value so the same file can be selected again
		if (inputFileRef.current) {
			inputFileRef.current.value = "";
		}
	};

	if (selectedImageUri) {
		return (
			<div className="relative h-44 w-full overflow-hidden rounded-md border border-border">
				<Image
					source={{ uri: selectedImageUri }}
					className="h-full w-full"
					contentFit="cover"
				/>
				<button
					type="button"
					onClick={handleRemovePhoto}
					className="absolute bottom-2 left-2 rounded-full bg-destructive p-2 hover:bg-destructive/90 transition-colors"
				>
					<Trash2Icon className="h-4 w-4 text-destructive-foreground" />
				</button>
			</div>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={handleAddPhoto}
				className="flex h-44 w-full flex-col items-center justify-center rounded-md border border-border bg-muted hover:bg-muted/80 transition-colors"
			>
				<CameraIcon className="h-6 w-6 text-primary mb-2" />
				<Text className="text-muted-foreground">Add Photo</Text>
			</button>
			<input
				ref={inputFileRef}
				type="file"
				accept="image/*"
				onChange={onFileChangeCapture}
				className="hidden"
			/>
		</>
	);
}
