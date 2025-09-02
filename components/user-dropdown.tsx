import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { Button } from "./ui/button";
import { ChevronDown } from "../lib/icons";
import { Text } from "./ui/text";
import { View } from "react-native";
import { cn } from "../lib/utils";

type User = {
  userId: string;
  name: string;
  avatarUrl: string;
  isSelected: boolean;
};

interface UserDropdownProps {
  users: User[];
  onUserToggle?: (userId: string) => void;
}

// UserAvatar component for consistent avatar rendering with fallback
interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  alt?: string;
  className?: string;
}

function UserAvatar({
  name = "?",
  avatarUrl,
  alt,
  className,
}: UserAvatarProps) {
  const initials = name ? name.slice(0, 1).toUpperCase() : "?";
  return (
    <Avatar alt={alt || `${name}'s Avatar`} className={className}>
      {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
      <AvatarFallback>
        <Text>{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );
}

export function UserDropdown({ users, onUserToggle }: UserDropdownProps) {
  // Get selected users
  const selectedUsers = users.filter((u) => u.isSelected);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex flex-row gap-x-2 items-center"
        >
          <View className="flex flex-row items-center">
            {selectedUsers.length === 0 && (
              <UserAvatar name="?" className="h-6 w-6" />
            )}
            {selectedUsers.length === 1 && (
              <UserAvatar
                name={selectedUsers[0].name}
                avatarUrl={selectedUsers[0].avatarUrl}
                className="h-6 w-6"
              />
            )}
            {selectedUsers.length > 1 && (
              <View className="flex flex-row">
                {selectedUsers.slice(0, 3).map((user, idx) => (
                  <UserAvatar
                    key={user.userId}
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    className={cn(
                      "h-6 w-6 border-2 border-white",
                      idx !== 0 && "-mx-2"
                    )}
                  />
                ))}
                {selectedUsers.length > 3 && (
                  <Avatar
                    alt="plus more users"
                    className="h-6 w-6 border-2 border-white"
                  >
                    <AvatarFallback className="font-medium text-xs">
                      +{selectedUsers.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </View>
            )}
          </View>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 native:w-72">
        <DropdownMenuLabel>User Profiles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {users.map((user) => (
            <DropdownMenuCheckboxItem
              checked={user.isSelected}
              onCheckedChange={() => onUserToggle && onUserToggle(user.userId)}
              key={user.userId}
              className="flex flex-row items-center gap-x-2"
              closeOnPress={false}
            >
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatarUrl}
                className="h-5 w-5"
              />
              <Text>{user.name}</Text>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
