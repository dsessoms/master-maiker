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
>(({ className, label, ...props }, ref) => {
	const [showPassword, setShowPassword] = React.useState(false);

	return (
		<View>
			<FormInput
				ref={ref}
				secureTextEntry={!showPassword}
				className={cn("pr-12", className)}
				label={label}
				{...props}
			/>
			<Pressable
				onPress={() => setShowPassword(!showPassword)}
				className="absolute right-3 h-10 native:h-12 justify-center"
				style={{
					// Label height + label padding bottom + input position
					// Label is typically ~16px (text-sm) + pb-1 (4px) / native:pb-2 (8px)
					top: label ? 26 : 0, // Approximate: 16px text + 8px padding on native
				}}
			>
				{showPassword ? (
					<EyeOff size={20} className="text-muted-foreground" />
				) : (
					<Eye size={20} className="text-muted-foreground" />
				)}
			</Pressable>
		</View>
	);
});

PasswordInput.displayName = "PasswordInput";
