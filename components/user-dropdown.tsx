import * as React from "react";

import { Avatar, AvatarFallback } from "./ui/avatar";
import { ChevronDown, Users } from "../lib/icons";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { Button } from "./ui/button";
import { Profile } from "@/types";
import { ProfileAvatar } from "./profile-avatar";
import { Text } from "./ui/text";
import { View } from "react-native";
import { cn } from "../lib/utils";
import { useRouter } from "expo-router";

type DropdownProfile = Profile & {
	isSelected: boolean;
	avatar_url?: string;
};

interface ProfileDropdownProps {
	profiles: DropdownProfile[];
	onProfileToggle?: (profileId: string) => void;
}

export function ProfileDropdown({
	profiles,
	onProfileToggle,
}: ProfileDropdownProps) {
	const router = useRouter();
	// Get selected profiles
	const selectedProfiles = profiles.filter((u) => u.isSelected);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="flex flex-row gap-x-2 items-center"
				>
					<View className="flex flex-row items-center">
						{selectedProfiles.length === 0 && (
							<ProfileAvatar name="?" className="h-6 w-6" />
						)}
						{selectedProfiles.length === 1 && (
							<ProfileAvatar
								name={selectedProfiles[0].name}
								avatarUrl={selectedProfiles[0].avatar_url}
								className="h-6 w-6"
							/>
						)}
						{selectedProfiles.length > 1 && (
							<View className="flex flex-row">
								{selectedProfiles.slice(0, 3).map((profile, idx) => (
									<ProfileAvatar
										key={profile.id}
										name={profile.name}
										avatarUrl={profile.avatar_url}
										className={cn(
											"h-6 w-6 border-2 border-white",
											idx !== 0 && "-mx-2",
										)}
									/>
								))}
								{selectedProfiles.length > 3 && (
									<Avatar
										alt="plus more profiles"
										className="h-6 w-6 border-2 border-white"
									>
										<AvatarFallback className="font-medium text-xs">
											+{selectedProfiles.length - 3}
										</AvatarFallback>
									</Avatar>
								)}
							</View>
						)}
					</View>
					<ChevronDown />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-64 native:w-72"
				align="start"
				sideOffset={2}
			>
				<DropdownMenuLabel>Profiles</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{profiles.map((profile) => (
						<DropdownMenuCheckboxItem
							checked={profile.isSelected}
							onCheckedChange={() =>
								onProfileToggle && onProfileToggle(profile.id)
							}
							key={profile.id}
							className="flex flex-row items-center gap-x-2"
							closeOnPress={false}
						>
							<ProfileAvatar
								name={profile.name}
								avatarUrl={profile.avatar_url}
								className="h-5 w-5"
							/>
							<Text>{profile.name}</Text>
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onPress={() => router.push("/account/profiles")}>
					<Users className="mr-2 h-4 w-4" />
					<Text>Manage</Text>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
