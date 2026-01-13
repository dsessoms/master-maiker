import {
	ActivityLevelSelect,
	CalorieTargetSelect,
	GenderSelect,
	WeightGoalSelect,
} from "@/components/forms/ProfileSelectComponents";
import { Calendar, MoreHorizontalIcon } from "@/lib/icons";
import {
	CreateProfileData,
	useCreateProfile,
} from "@/hooks/profiles/useCreateProfile";
import DateTimePicker, {
	DateType,
	useDefaultStyles,
} from "react-native-ui-datepicker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	UpdateProfileData,
	useUpdateProfile,
} from "@/hooks/profiles/useUpdateProfile";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipsInput } from "@/components/ui/chips-input";
import { Database } from "@/database.types";
import { H4 } from "@/components/ui/typography";
import { HeightInput } from "@/components/forms/HeightInput";
import { ImageUploader } from "@/components/forms/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Text } from "@/components/ui/text";
import { supabase } from "@/config/supabase";
import { useAvatarImage } from "@/hooks/profiles/use-avatar-image";
import { useTheme } from "@/context/theme-context";
import { v4 as uuidv4 } from "uuid";

type Profile = Database["public"]["Tables"]["profile"]["Row"];

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
	sedentary: 1.2,
	lightly_active: 1.375,
	moderately_active: 1.55,
	very_active: 1.725,
	extremely_active: 1.9,
};

// Helper function to calculate age from birthday
const calculateAge = (birthday: string): number => {
	const today = new Date();
	const birthDate = new Date(birthday);
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < birthDate.getDate())
	) {
		age--;
	}

	return age;
};

// Mifflin-St Jeor BMR calculation
const calculateBMR = (
	weightLbs: number,
	heightInches: number,
	age: number,
	gender: string,
): number => {
	// Convert units
	const weightKg = weightLbs * 0.453592; // lbs to kg
	const heightCm = heightInches * 2.54; // inches to cm

	let bmr: number;
	if (gender === "male") {
		bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
	} else if (gender === "female") {
		bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
	} else {
		// If gender is not specified or other, use average of male and female
		const maleBMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
		const femaleBMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
		bmr = (maleBMR + femaleBMR) / 2;
	}

	return Math.round(bmr);
};

// Calculate Total Daily Energy Expenditure (TDEE)
const calculateTDEE = (bmr: number, activityLevel: string): number => {
	const multiplier =
		ACTIVITY_MULTIPLIERS[activityLevel as keyof typeof ACTIVITY_MULTIPLIERS] ||
		1.2;
	return Math.round(bmr * multiplier);
};

// Adjust TDEE based on weight goals (500 calories per pound per week)
const adjustCaloriesForWeightGoal = (
	tdee: number,
	calorieTargetType: string,
	goalLbsPerWeek: number,
): number => {
	if (calorieTargetType === "lose") {
		// Subtract 500 calories per pound to lose per week
		return tdee - goalLbsPerWeek * 500;
	} else if (calorieTargetType === "gain") {
		// Add 500 calories per pound to gain per week
		return tdee + goalLbsPerWeek * 500;
	}
	// For "maintain", return TDEE as is
	return tdee;
};

interface ProfileFormProps {
	profile?: Profile;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function ProfileForm({
	profile,
	onSuccess,
	onCancel,
}: ProfileFormProps) {
	const isEditing = !!profile;
	const createProfile = useCreateProfile();
	const updateProfile = useUpdateProfile();
	const existingAvatarUrl = useAvatarImage(profile?.avatar_id);

	// Simple state management
	const [formData, setFormData] = useState({
		name: profile?.name || "",
		birthday: profile?.birthday || "",
		gender: profile?.gender || "",
		weight_lb: profile?.weight_lb?.toString() || "",
		height_in: profile?.height_in || 0, // Keep as number for HeightInput
		activity_level: profile?.activity_level || "",
		calorie_target_type: profile?.calorie_target_type || "",
		daily_calorie_goal: profile?.daily_calorie_goal?.toString() || "",
		goal_lbs_per_week: profile?.goal_lbs_per_week?.toString() || "",
		protein_grams: profile?.protein_grams?.toString() || "",
		carbs_grams: profile?.carbs_grams?.toString() || "",
		fat_grams: profile?.fat_grams?.toString() || "",
	});

	// Food preferences state
	const [likedFood, setLikedFood] = useState<string[]>(
		profile?.liked_food || [],
	);
	const [dislikedFood, setDislikedFood] = useState<string[]>(
		profile?.disliked_food || [],
	);

	// Macro nutrients toggle state - determine initial state based on existing values
	const getInitialMacroToggles = () => {
		const toggles: string[] = [];
		if (profile?.protein_grams) toggles.push("protein");
		if (profile?.carbs_grams) toggles.push("carbs");
		if (profile?.fat_grams) toggles.push("fat");
		return toggles;
	};
	const [enabledMacros, setEnabledMacros] = useState<string[]>(
		getInitialMacroToggles(),
	);

	const defaultStyles = useDefaultStyles();

	// Initialize selectedDate from profile birthday
	const [selectedDate, setSelectedDate] = useState<DateType>(() => {
		if (!profile?.birthday) return undefined;

		// Parse the date string as local date to avoid UTC timezone issues
		const [year, month, day] = profile.birthday.split("-").map(Number);
		return new Date(year, month - 1, day); // month is 0-indexed
	});

	// State for the birthday text input
	const [birthdayInput, setBirthdayInput] = useState<string>(() => {
		if (!profile?.birthday) return "";
		const [year, month, day] = profile.birthday.split("-").map(Number);
		return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
	});

	// Avatar state management
	const [selectedAvatar, setSelectedAvatar] = useState<
		{ file: File; uri: string } | string | undefined
	>(existingAvatarUrl);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

	// Calculate recommended daily calories
	const getRecommendedCalories = (): number | null => {
		const weight = Number(formData.weight_lb);
		const height = formData.height_in;
		const birthday = formData.birthday;
		const gender = formData.gender;
		const activityLevel = formData.activity_level;
		const calorieTargetType = formData.calorie_target_type;
		const goalLbsPerWeek = Number(formData.goal_lbs_per_week);

		// Check if we have all required data
		if (
			!weight ||
			weight <= 0 ||
			!height ||
			height <= 0 ||
			!birthday ||
			!gender ||
			!activityLevel
		) {
			return null;
		}

		try {
			const age = calculateAge(birthday);
			if (age <= 0 || age > 120) return null; // Sanity check on age

			const bmr = calculateBMR(weight, height, age, gender);
			let tdee = calculateTDEE(bmr, activityLevel);

			// Adjust for weight goals if specified
			if (
				calorieTargetType &&
				(calorieTargetType === "lose" || calorieTargetType === "gain")
			) {
				if (goalLbsPerWeek && goalLbsPerWeek > 0) {
					tdee = adjustCaloriesForWeightGoal(
						tdee,
						calorieTargetType,
						goalLbsPerWeek,
					);
				}
			}

			return Math.max(1200, tdee); // Minimum safe calorie floor
		} catch (error) {
			console.error("Error calculating recommended calories:", error);
			return null;
		}
	};

	const recommendedCalories = getRecommendedCalories();

	// Get detailed calculation breakdown for display
	const getCalculationBreakdown = (): string => {
		const weight = Number(formData.weight_lb);
		const height = formData.height_in;
		const birthday = formData.birthday;
		const gender = formData.gender;
		const activityLevel = formData.activity_level;
		const calorieTargetType = formData.calorie_target_type;
		const goalLbsPerWeek = Number(formData.goal_lbs_per_week);

		if (!weight || !height || !birthday || !gender || !activityLevel) {
			return "Complete all required fields to see calculation details.";
		}

		try {
			const age = calculateAge(birthday);
			const weightKg = (weight * 0.453592).toFixed(1);
			const heightCm = (height * 2.54).toFixed(1);

			// Calculate BMR with formula display
			let bmrFormula: string;
			let bmr: number;

			if (gender === "male") {
				bmr = calculateBMR(weight, height, age, gender);
				bmrFormula = `BMR = 10×${weightKg} + 6.25×${heightCm} - 5×${age} + 5 = ${bmr} calories`;
			} else if (gender === "female") {
				bmr = calculateBMR(weight, height, age, gender);
				bmrFormula = `BMR = 10×${weightKg} + 6.25×${heightCm} - 5×${age} - 161 = ${bmr} calories`;
			} else {
				bmr = calculateBMR(weight, height, age, gender);
				bmrFormula = `BMR = Average of male/female formulas = ${bmr} calories`;
			}

			// Activity level calculation
			const multiplier =
				ACTIVITY_MULTIPLIERS[
					activityLevel as keyof typeof ACTIVITY_MULTIPLIERS
				] || 1.2;
			const tdee = calculateTDEE(bmr, activityLevel);
			const activityText = activityLevel
				.replace("_", " ")
				.replace(/\b\w/g, (l) => l.toUpperCase());

			let breakdown = `Mifflin-St Jeor Equation:\n${bmrFormula}\n\nTDEE (Total Daily Energy Expenditure):\n${bmr} × ${multiplier} (${activityText}) = ${tdee} calories/day`;

			// Add weight goal adjustment if applicable
			if (
				calorieTargetType &&
				(calorieTargetType === "lose" || calorieTargetType === "gain") &&
				goalLbsPerWeek > 0
			) {
				const adjustment = goalLbsPerWeek * 500;
				const finalCalories = Math.max(
					1200,
					adjustCaloriesForWeightGoal(tdee, calorieTargetType, goalLbsPerWeek),
				);
				const operation = calorieTargetType === "lose" ? "subtract" : "add";

				breakdown += `\n\nWeight Goal Adjustment:\n${tdee} ${calorieTargetType === "lose" ? "−" : "+"} ${adjustment} calories (${goalLbsPerWeek} lbs/week) = ${finalCalories} calories/day`;
			}

			return breakdown;
		} catch (error) {
			return "Error calculating breakdown. Please check your inputs.";
		}
	};

	const updateField = (field: string, value: string | boolean | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// Format date for display
	const formatDate = (date: DateType): string => {
		if (!date) return "";

		// Handle different date types (Date, string, Dayjs)
		let dateObj: Date;
		if (date instanceof Date) {
			dateObj = date;
		} else if (typeof date === "string") {
			dateObj = new Date(date);
		} else {
			// Assume it's a Dayjs object
			dateObj = (date as any).toDate();
		}

		return dateObj.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Handle date selection
	const handleDateSelect = (date: DateType) => {
		setSelectedDate(date);
		if (date) {
			// Handle different date types (Date, string, Dayjs)
			let dateObj: Date;
			if (date instanceof Date) {
				dateObj = date;
			} else if (typeof date === "string") {
				dateObj = new Date(date);
			} else {
				// Assume it's a Dayjs object
				dateObj = (date as any).toDate();
			}

			// Format date in local timezone to avoid UTC conversion issues
			const year = dateObj.getFullYear();
			const month = String(dateObj.getMonth() + 1).padStart(2, "0");
			const day = String(dateObj.getDate()).padStart(2, "0");
			const formattedDate = `${year}-${month}-${day}`;
			updateField("birthday", formattedDate);

			// Update the text input display
			setBirthdayInput(`${month}/${day}/${year}`);
		}
	};

	// Handle text input for birthday
	const handleBirthdayTextChange = (text: string) => {
		// Remove non-numeric and non-slash characters
		let cleaned = text.replace(/[^\d/]/g, "");

		// Auto-add slashes as user types
		if (cleaned.length === 2 && birthdayInput.length === 1) {
			cleaned = cleaned + "/";
		} else if (cleaned.length === 5 && birthdayInput.length === 4) {
			cleaned = cleaned + "/";
		}

		// Limit to MM/DD/YYYY format (10 characters)
		if (cleaned.length > 10) {
			cleaned = cleaned.slice(0, 10);
		}

		// Update the input display
		setBirthdayInput(cleaned);

		// Parse and validate the complete date
		const parts = cleaned.split("/");
		if (
			parts.length === 3 &&
			parts[0].length === 2 &&
			parts[1].length === 2 &&
			parts[2].length === 4
		) {
			const month = parseInt(parts[0]);
			const day = parseInt(parts[1]);
			const year = parseInt(parts[2]);

			// Validate the date values
			if (
				month >= 1 &&
				month <= 12 &&
				day >= 1 &&
				day <= 31 &&
				year >= 1900 &&
				year <= 2100
			) {
				// Create date object and update both states
				const dateObj = new Date(year, month - 1, day);
				const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				updateField("birthday", formattedDate);
				setSelectedDate(dateObj);
			}
		} else if (cleaned.length === 0) {
			// Clear the date if input is empty
			updateField("birthday", "");
			setSelectedDate(undefined);
		}
	};

	const onSubmit = async () => {
		try {
			setIsUploadingAvatar(true);
			let avatar_id: string | undefined;

			// Handle avatar upload if there's a new file
			if (
				selectedAvatar &&
				typeof selectedAvatar === "object" &&
				"file" in selectedAvatar
			) {
				try {
					const newAvatarUUID = uuidv4();
					const { error: uploadError } = await supabase.storage
						.from("avatar-photos")
						.upload(newAvatarUUID, selectedAvatar.file);

					if (uploadError) {
						console.error("Avatar upload error:", uploadError);
						throw new Error("Failed to upload avatar");
					}

					avatar_id = newAvatarUUID;
				} catch (error) {
					console.error("Error uploading avatar:", error);
					// Continue without avatar if upload fails
				}
			} else if (
				typeof selectedAvatar === "string" &&
				selectedAvatar === existingAvatarUrl
			) {
				// Keep existing avatar ID if the selected avatar is the same as the existing one
				avatar_id = profile?.avatar_id || undefined;
			} else if (typeof selectedAvatar === "string") {
				// This is a new URL that's not the existing one, treat as new avatar ID
				avatar_id = selectedAvatar;
			}

			const data: CreateProfileData = {
				name: formData.name,
				birthday: formData.birthday || undefined,
				gender: (formData.gender as any) || undefined,
				weight_lb: formData.weight_lb ? Number(formData.weight_lb) : undefined,
				height_in: formData.height_in > 0 ? formData.height_in : undefined,
				activity_level: (formData.activity_level as any) || undefined,
				calorie_target_type: (formData.calorie_target_type as any) || undefined,
				daily_calorie_goal: formData.daily_calorie_goal
					? Number(formData.daily_calorie_goal)
					: undefined,
				goal_lbs_per_week: formData.goal_lbs_per_week
					? Number(formData.goal_lbs_per_week)
					: undefined,
				protein_grams:
					enabledMacros.includes("protein") && formData.protein_grams
						? Number(formData.protein_grams)
						: null,
				carbs_grams:
					enabledMacros.includes("carbs") && formData.carbs_grams
						? Number(formData.carbs_grams)
						: null,
				fat_grams:
					enabledMacros.includes("fat") && formData.fat_grams
						? Number(formData.fat_grams)
						: null,
				avatar_id: avatar_id,
				liked_food: likedFood.length > 0 ? likedFood : undefined,
				disliked_food: dislikedFood.length > 0 ? dislikedFood : undefined,
			};

			if (isEditing) {
				await updateProfile.mutateAsync({
					id: profile.id,
					...data,
				} as UpdateProfileData);
			} else {
				await createProfile.mutateAsync(data);
			}
			onSuccess?.();
		} catch (error) {
			console.error("Error saving profile:", error);
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const isLoading =
		createProfile.isPending || updateProfile.isPending || isUploadingAvatar;

	return (
		<ScrollView
			className="bg-background"
			keyboardShouldPersistTaps="handled"
			contentContainerClassName="items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
			keyboardDismissMode="interactive"
		>
			<Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5 p-4">
				<View className="gap-y-4">
					{/* Avatar Section */}
					<View>
						<ImageUploader
							variant="circular"
							selectedImageUri={
								typeof selectedAvatar === "string"
									? selectedAvatar
									: selectedAvatar?.uri
							}
							onImageSelected={setSelectedAvatar}
						/>
					</View>

					{/* Basic Information */}
					<View className="gap-y-3">
						<H4>Basic Information</H4>
						<View className="gap-y-2">
							<Label>Name</Label>
							<Input
								placeholder="Enter name"
								value={formData.name}
								onChangeText={(text) => updateField("name", text)}
							/>
						</View>
						<View className="gap-y-2">
							<Label>Birthday</Label>
							<View className="flex-row gap-2">
								<View className="flex-1">
									<Input
										placeholder="MM/DD/YYYY"
										value={birthdayInput}
										onChangeText={handleBirthdayTextChange}
										keyboardType="numeric"
									/>
								</View>
								<Popover>
									<PopoverTrigger asChild>
										<Button variant="outline" size="icon" className="h-10 w-10">
											<Calendar className="text-foreground" size={20} />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-64 p-0" align="start">
										<DateTimePicker
											mode="single"
											date={selectedDate}
											onChange={({ date }) => handleDateSelect(date)}
											styles={defaultStyles}
											navigationPosition="right"
										/>
									</PopoverContent>
								</Popover>
							</View>
						</View>
						<GenderSelect
							value={formData.gender}
							onValueChange={(value) => updateField("gender", value)}
						/>
					</View>

					{/* Physical Stats */}
					<View className="gap-y-3">
						<H4>Physical Stats</H4>

						<View className="gap-y-2">
							<Label>Weight (lbs)</Label>
							<Input
								placeholder="Enter weight"
								value={formData.weight_lb}
								onChangeText={(text) => updateField("weight_lb", text)}
								keyboardType="numeric"
							/>
						</View>

						<HeightInput
							totalInches={formData.height_in}
							onHeightChange={(totalInches) =>
								updateField("height_in", totalInches)
							}
						/>

						<ActivityLevelSelect
							value={formData.activity_level}
							onValueChange={(value) => updateField("activity_level", value)}
						/>
					</View>

					{/* Nutrition Goals */}
					<View className="gap-y-3">
						<H4>Nutrition Goals</H4>
						<CalorieTargetSelect
							value={formData.calorie_target_type}
							onValueChange={(value) =>
								updateField("calorie_target_type", value)
							}
						/>
						{/* Weight Goal Select - only visible for gain/lose */}
						{(formData.calorie_target_type === "gain" ||
							formData.calorie_target_type === "lose") && (
							<WeightGoalSelect
								value={formData.goal_lbs_per_week}
								onValueChange={(value) =>
									updateField("goal_lbs_per_week", value)
								}
							/>
						)}
						<View className="gap-y-2">
							<Label>Daily Calorie Goal</Label>
							<Input
								placeholder="Enter daily calorie goal"
								value={formData.daily_calorie_goal}
								onChangeText={(text) => updateField("daily_calorie_goal", text)}
								keyboardType="numeric"
							/>
							{/* Recommended calories hint with info button */}
							{recommendedCalories && (
								<View className="flex-row items-center justify-between">
									<Text className="text-sm text-muted-foreground">
										{`Recommended: ${recommendedCalories.toLocaleString()} calories/day`}
									</Text>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 w-6 rounded-full p-0"
											>
												<Text className="text-sm text-muted-foreground">ⓘ</Text>
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-80" align="end">
											<View className="gap-y-2">
												<Text className="font-medium text-foreground">
													Calculation Details
												</Text>
												<Text className="text-sm text-muted-foreground whitespace-pre-line">
													{getCalculationBreakdown()}
												</Text>
											</View>
										</PopoverContent>
									</Popover>
								</View>
							)}
						</View>
						{/* Macro Nutrients Toggle Group */}
						<View className="gap-y-3">
							<Label>Macro Nutrient Goals</Label>
							<ToggleGroup
								type="multiple"
								variant="outline"
								value={enabledMacros}
								onValueChange={setEnabledMacros}
								className="justify-start"
							>
								<ToggleGroupItem value="protein" isFirst>
									<Text>Protein</Text>
								</ToggleGroupItem>
								<ToggleGroupItem value="carbs">
									<Text>Carbs</Text>
								</ToggleGroupItem>
								<ToggleGroupItem value="fat" isLast>
									<Text>Fat</Text>
								</ToggleGroupItem>
							</ToggleGroup>

							{/* Conditional Macro Inputs */}
							{enabledMacros.length > 0 && (
								<View className="flex-row gap-x-4">
									{enabledMacros.includes("protein") && (
										<View className="flex-1 gap-y-2">
											<Label>Protein (g)</Label>
											<Input
												placeholder="Protein"
												value={formData.protein_grams}
												onChangeText={(text) =>
													updateField("protein_grams", text)
												}
												keyboardType="numeric"
											/>
										</View>
									)}

									{enabledMacros.includes("carbs") && (
										<View className="flex-1 gap-y-2">
											<Label>Carbs (g)</Label>
											<Input
												placeholder="Carbs"
												value={formData.carbs_grams}
												onChangeText={(text) =>
													updateField("carbs_grams", text)
												}
												keyboardType="numeric"
											/>
										</View>
									)}

									{enabledMacros.includes("fat") && (
										<View className="flex-1 gap-y-2">
											<Label>Fat (g)</Label>
											<Input
												placeholder="Fat"
												value={formData.fat_grams}
												onChangeText={(text) => updateField("fat_grams", text)}
												keyboardType="numeric"
											/>
										</View>
									)}
								</View>
							)}
						</View>
					</View>

					{/* Food Preferences */}
					<View className="gap-y-3">
						<H4>Food Preferences</H4>

						<ChipsInput
							label="Liked Foods"
							placeholder="Type a food you like and press Enter"
							chips={likedFood}
							onChipsChange={setLikedFood}
							disabled={isLoading}
						/>

						<ChipsInput
							label="Disliked Foods"
							placeholder="Type a food you dislike and press Enter"
							chips={dislikedFood}
							onChipsChange={setDislikedFood}
							disabled={isLoading}
						/>
					</View>

					{/* Action Buttons */}
					<View className="flex-row gap-x-3 mt-4">
						<Button
							variant="outline"
							className="flex-1"
							onPress={onCancel}
							disabled={isLoading}
						>
							<Text>Cancel</Text>
						</Button>

						<Button
							className="flex-1 flex-row gap-2"
							onPress={onSubmit}
							disabled={isLoading}
						>
							{isLoading && (
								<LoadingIndicator size="small" themeColor="primaryForeground" />
							)}
							<Text>{isEditing ? "Update Profile" : "Create Profile"}</Text>
						</Button>
					</View>
				</View>
			</Card>
		</ScrollView>
	);
}
