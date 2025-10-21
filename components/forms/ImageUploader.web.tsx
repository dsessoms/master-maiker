import { CameraIcon, Trash2Icon } from "@/lib/icons";
import React, { useRef } from "react";

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

	if (variant === "circular") {
		if (selectedImageUri) {
			return (
				<div className="flex items-center justify-center">
					<div
						className="relative rounded-full border-2 border-border"
						style={{ width: size, height: size }}
					>
						<div
							className="overflow-hidden rounded-full"
							style={{ width: size, height: size }}
						>
							<Image
								source={{ uri: selectedImageUri }}
								className="h-full w-full"
								contentFit="cover"
							/>
						</div>
						<button
							type="button"
							onClick={handleRemovePhoto}
							className="absolute -bottom-1 -right-1 rounded-full bg-destructive p-1.5 border-2 border-background hover:bg-destructive/90 transition-colors"
						>
							<Trash2Icon className="h-3 w-3 text-destructive-foreground" />
						</button>
					</div>
					<input
						ref={inputFileRef}
						type="file"
						accept="image/*"
						onChange={onFileChangeCapture}
						className="hidden"
					/>
				</div>
			);
		}

		return (
			<div className="flex items-center justify-center">
				<button
					type="button"
					onClick={handleAddPhoto}
					className="flex items-center justify-center rounded-full border-2 border-dashed border-border bg-muted hover:bg-muted/80 transition-colors"
					style={{ width: size, height: size }}
				>
					<div className="flex flex-col items-center">
						<CameraIcon className="h-6 w-6 text-primary mb-1" />
						<Text className="text-xs text-muted-foreground text-center px-2">
							Add Photo
						</Text>
					</div>
				</button>
				<input
					ref={inputFileRef}
					type="file"
					accept="image/*"
					onChange={onFileChangeCapture}
					className="hidden"
				/>
			</div>
		);
	}

	// Rectangular variant (original behavior)
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
