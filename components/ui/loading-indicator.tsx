import { Loader2 } from "@/lib/icons";
import { View } from "react-native";
import { cn } from "@/lib/utils";

export const LoadingIndicator = ({ className }: { className?: string }) => {
	return (
		<View className="pointer-events-none animate-spin">
			<Loader2 className={cn("text-primary-foreground h-4 w-4", className)} />
		</View>
	);
};
