import { Button, ButtonProps } from "@/components/ui/button";

import { Image } from "@/components/image";
import { useColorScheme } from "@/lib/useColorScheme";

export const MustrdButton = (props: ButtonProps) => {
	const { colorScheme } = useColorScheme();
	const appIcon =
		colorScheme === "dark"
			? require("@/assets/logo-with-yellow-background.png")
			: require("@/assets/bottle-logo.png");

	return (
		<Button {...props} size="icon" className="h-12 w-12 rounded-full shadow-sm">
			<Image contentFit="contain" source={appIcon} className="w-8 h-8" />
		</Button>
	);
};
