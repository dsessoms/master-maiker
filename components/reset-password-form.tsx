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

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";
import { useForm } from "react-hook-form";
import { useRouter } from "expo-router";
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
});

export function ResetPasswordForm() {
	const router = useRouter();
	const { confirmPasswordReset } = useAuth();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			newPassword: "",
		},
	});

	function onPasswordSubmitEditing() {
		form.handleSubmit(onSubmit)();
	}

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			await confirmPasswordReset(data.newPassword);
			form.reset();
			// Navigate to the main app since user is now authenticated
			router.replace("/");
		} catch (error: Error | any) {
			console.error(error.message);
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
						Enter your new password
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-6">
					<Form {...form}>
						<View className="gap-6">
							<FormField
								control={form.control}
								name="newPassword"
								render={({ field }) => (
									<PasswordInput
										label="New password"
										placeholder="Enter new password"
										returnKeyType="send"
										onSubmitEditing={onPasswordSubmitEditing}
										{...field}
									/>
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
					<Text className="text-center text-sm">
						Remember your password?{" "}
						<Pressable
							onPress={() => {
								router.replace("/sign-in");
							}}
						>
							<Text className="text-sm underline underline-offset-4">
								Sign in
							</Text>
						</Pressable>
					</Text>
				</CardContent>
			</Card>
		</View>
	);
}
