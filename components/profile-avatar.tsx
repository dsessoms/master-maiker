import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

import { Text } from "./ui/text";

// ProfileAvatar component for consistent avatar rendering with fallback
interface ProfileAvatarProps {
	name?: string;
	avatarUrl?: string;
	alt?: string;
	className?: string;
}

export function ProfileAvatar({
	name = "?",
	avatarUrl,
	alt,
	className,
}: ProfileAvatarProps) {
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
