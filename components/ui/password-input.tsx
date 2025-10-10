import * as React from "react";

import { Eye, EyeOff } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { FormInput } from "@/components/ui/form";
import { cn } from "@/lib/utils";

// Use the same props as FormInput but make secureTextEntry controlled internally
type PasswordInputProps = Omit<
	React.ComponentPropsWithoutRef<typeof FormInput>,
	"secureTextEntry"
>;

export const PasswordInput = React.forwardRef<
	React.ComponentRef<typeof FormInput>,
	PasswordInputProps
>(({ className, ...props }, ref) => {
	const [showPassword, setShowPassword] = React.useState(false);

	return (
		<View className="relative">
			<FormInput
				ref={ref}
				secureTextEntry={!showPassword}
				className={cn("pr-12", className)}
				{...props}
			/>
			<View
				className="absolute right-3 top-0 bottom-0 justify-center"
				style={{
					paddingTop: props.label ? 28 : 0,
				}}
			>
				<Pressable onPress={() => setShowPassword(!showPassword)}>
					{showPassword ? (
						<EyeOff size={20} className="text-muted-foreground" />
					) : (
						<Eye size={20} className="text-muted-foreground" />
					)}
				</Pressable>
			</View>
		</View>
	);
});

PasswordInput.displayName = "PasswordInput";
