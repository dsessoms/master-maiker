import React from "react";
import { View } from "react-native";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	type Option,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";

// Gender Select Component
interface GenderSelectProps {
	value: string;
	onValueChange: (value: string) => void;
}

export function GenderSelect({ value, onValueChange }: GenderSelectProps) {
	const genderOptions = [
		{ value: "male", label: "Male" },
		{ value: "female", label: "Female" },
		{ value: "other", label: "Other" },
	];

	const handleValueChange = (option: Option) => {
		if (option?.value) {
			onValueChange(option.value);
		}
	};

	const selectedOption = genderOptions.find((opt) => opt.value === value);

	return (
		<View className="gap-y-2">
			<Label>Gender</Label>
			<Select value={selectedOption} onValueChange={handleValueChange}>
				<SelectTrigger>
					<SelectValue placeholder="Select gender" />
				</SelectTrigger>
				<SelectContent>
					{genderOptions.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							label={option.label}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</View>
	);
}

// Activity Level Select Component with descriptions
interface ActivityLevelSelectProps {
	value: string;
	onValueChange: (value: string) => void;
}

const activityLevels = [
	{
		value: "sedentary",
		label: "Sedentary",
		description: "Little or no exercise, desk job",
	},
	{
		value: "lightly_active",
		label: "Lightly Active",
		description: "Light exercise 1-3 days per week",
	},
	{
		value: "moderately_active",
		label: "Moderately Active",
		description: "Moderate exercise 3-5 days per week",
	},
	{
		value: "very_active",
		label: "Very Active",
		description: "Hard exercise 6-7 days per week",
	},
	{
		value: "extremely_active",
		label: "Extremely Active",
		description: "Very hard exercise, physical job, or 2x/day training",
	},
];

export function ActivityLevelSelect({
	value,
	onValueChange,
}: ActivityLevelSelectProps) {
	const selectedLevel = activityLevels.find((level) => level.value === value);
	const selectedOption = selectedLevel
		? { value: selectedLevel.value, label: selectedLevel.label }
		: undefined;

	const handleValueChange = (option: Option) => {
		if (option?.value) {
			onValueChange(option.value);
		}
	};

	return (
		<View className="gap-y-2">
			<Label>Activity Level</Label>
			<Select value={selectedOption} onValueChange={handleValueChange}>
				<SelectTrigger>
					<SelectValue placeholder="Select activity level" />
				</SelectTrigger>
				<SelectContent>
					{activityLevels.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							label={option.label}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{selectedLevel && (
				<Text className="text-xs text-muted-foreground mt-1">
					{selectedLevel.description}
				</Text>
			)}
		</View>
	);
}

// Calorie Target Type Select Component
interface CalorieTargetSelectProps {
	value: string;
	onValueChange: (value: string) => void;
}

export function CalorieTargetSelect({
	value,
	onValueChange,
}: CalorieTargetSelectProps) {
	const targetOptions = [
		{ value: "lose", label: "Lose Weight" },
		{ value: "maintain", label: "Maintain Weight" },
		{ value: "gain", label: "Gain Weight" },
	];

	const handleValueChange = (option: Option) => {
		if (option?.value) {
			onValueChange(option.value);
		}
	};

	const selectedOption = targetOptions.find((opt) => opt.value === value);

	return (
		<View className="gap-y-2">
			<Label>Calorie Target</Label>
			<Select value={selectedOption} onValueChange={handleValueChange}>
				<SelectTrigger>
					<SelectValue placeholder="Select calorie target" />
				</SelectTrigger>
				<SelectContent>
					{targetOptions.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							label={option.label}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</View>
	);
}

// Weight Goal Select Component (visible when gain or lose is selected)
interface WeightGoalSelectProps {
	value: string;
	onValueChange: (value: string) => void;
}

export function WeightGoalSelect({
	value,
	onValueChange,
}: WeightGoalSelectProps) {
	const goalOptions = [
		{ value: "0.5", label: "0.5 lbs/week" },
		{ value: "1", label: "1 lb/week" },
		{ value: "1.5", label: "1.5 lbs/week" },
		{ value: "2", label: "2 lbs/week" },
	];

	const handleValueChange = (option: Option) => {
		if (option?.value) {
			onValueChange(option.value);
		}
	};

	const selectedOption = goalOptions.find((opt) => opt.value === value);

	return (
		<View className="gap-y-2">
			<Label>Weight Goal Per Week</Label>
			<Select value={selectedOption} onValueChange={handleValueChange}>
				<SelectTrigger>
					<SelectValue placeholder="Select weight goal" />
				</SelectTrigger>
				<SelectContent>
					{goalOptions.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							label={option.label}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</View>
	);
}
