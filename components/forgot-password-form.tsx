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
import { Form, FormField, FormInput } from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";
import { useForm } from "react-hook-form";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
});

export function ForgotPasswordForm() {
	const router = useRouter();
	const { resetPassword, setResetEmail } = useAuth();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			await resetPassword(data.email);
			// Store email in context securely
			setResetEmail(data.email);
			form.reset();
			// Navigate to reset password with code form without exposing email in URL
			router.replace("/reset-password-with-code");
		} catch (error: Error | any) {
			console.error(error.message);
		}
	}

	return (
		<View className="gap-6">
			<Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
				<CardHeader>
					<CardTitle className="text-center text-xl sm:text-left">
						Forgot password?
					</CardTitle>
					<CardDescription className="text-center sm:text-left">
						Enter your email to reset your password
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-6">
					<Form {...form}>
						<View className="gap-6">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormInput
										label="Email"
										placeholder="m@example.com"
										keyboardType="email-address"
										autoComplete="email"
										autoCapitalize="none"
										autoCorrect={false}
										returnKeyType="send"
										onSubmitEditing={() => form.handleSubmit(onSubmit)()}
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
									<Text>Reset your password</Text>
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
