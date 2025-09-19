import { View } from "react-native";
import { cn } from "@/lib/utils";

function Skeleton({
	className,
	...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
	return (
		<View
			className={cn("bg-loading animate-pulse rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
