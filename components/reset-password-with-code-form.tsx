import * as React from "react";
import * as z from "zod";

import { ActivityIndicator, Pressable, View } from "react-native";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Form, FormField } from "@/components/ui/form";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
	newPassword: z
		.string()
		.min(8, "Please enter at least 8 characters.")
		.max(64, "Please enter fewer than 64 characters.")
		.regex(
			/^(?=.*[a-z])/,
			"Your password must have at least one lowercase letter.",
		)
		.regex(
			/^(?=.*[A-Z])/,
			"Your password must have at least one uppercase letter.",
		)
		.regex(/^(?=.*[0-9])/, "Your password must have at least one number.")
		.regex(
			/^(?=.*[!@#$%^&*])/,
			"Your password must have at least one special character.",
		),
	code: z
		.string()
		.min(6, "Please enter the 6-digit code from your email.")
		.max(6, "Code should be 6 digits.")
		.regex(/^\d{6}$/, "Code should only contain numbers."),
});

interface ResetPasswordWithCodeFormProps {
	email?: string;
}

export function ResetPasswordWithCodeForm({
	email,
}: ResetPasswordWithCodeFormProps) {
	const router = useRouter();
	const { verifyOtpAndResetPassword, resetEmail, setResetEmail } = useAuth();
	const params = useLocalSearchParams();

	// Get email from props, context, or URL params (fallback)
	const userEmail = email || resetEmail || (params.email as string) || "";

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			newPassword: "",
			code: "",
		},
	});

	function onPasswordSubmitEditing() {
		// Focus will be handled by the form's natural flow
	}

	function onCodeSubmitEditing() {
		form.handleSubmit(onSubmit)();
	}

	async function onSubmit(data: z.infer<typeof formSchema>) {
		if (!userEmail) {
			console.error("No email provided for password reset");
			return;
		}

		try {
			await verifyOtpAndResetPassword(userEmail, data.code, data.newPassword);
			form.reset();
			// Clear the stored reset email after successful reset
			setResetEmail(null);
			// Navigate to sign-in page after successful password reset
			router.replace("/sign-in");
		} catch (error: Error | any) {
			console.error("Error resetting password:", error.message);
		}
	}

	return (
		<View className="gap-6">
			<Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
				<CardHeader>
					<CardTitle className="text-center text-xl sm:text-left">
						Reset password
					</CardTitle>
					<CardDescription className="text-center sm:text-left">
						Enter the code sent to your email and set a new password
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-6">
					<Form {...form}>
						<View className="gap-6">
							<FormField
								control={form.control}
								name="newPassword"
								render={({ field }) => (
									<View className="gap-1.5">
										<View className="flex-row items-center">
											<Label htmlFor="newPassword">New password</Label>
										</View>
										<PasswordInput
											placeholder="Enter new password"
											returnKeyType="next"
											onSubmitEditing={onPasswordSubmitEditing}
											{...field}
										/>
									</View>
								)}
							/>
							<FormField
								control={form.control}
								name="code"
								render={({ field }) => (
									<View className="gap-1.5">
										<Label htmlFor="code">Verification code</Label>
										<Input
											placeholder="000000"
											autoCapitalize="none"
											returnKeyType="send"
											keyboardType="numeric"
											autoComplete="sms-otp"
											textContentType="oneTimeCode"
											onSubmitEditing={onCodeSubmitEditing}
											{...field}
										/>
									</View>
								)}
							/>
							<Button
								className="w-full"
								onPress={form.handleSubmit(onSubmit)}
								disabled={form.formState.isSubmitting}
							>
								{form.formState.isSubmitting ? (
									<ActivityIndicator size="small" />
								) : (
									<Text>Reset Password</Text>
								)}
							</Button>
						</View>
					</Form>
					<View className="flex-row justify-center items-baseline">
						<Text className="text-sm">Remember your password? </Text>
						<Pressable
							onPress={() => {
								router.replace("/sign-in");
							}}
						>
							<Text className="text-sm underline underline-offset-4">
								Sign in
							</Text>
						</Pressable>
					</View>
				</CardContent>
			</Card>
		</View>
	);
}
