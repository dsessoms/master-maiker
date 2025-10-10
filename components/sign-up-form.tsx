import * as React from "react";
import * as z from "zod";

import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Form, FormField, FormInput } from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { SocialConnections } from "@/components/social-connections";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/supabase-provider";
import { useForm } from "react-hook-form";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
	password: z
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

export function SignUpForm() {
	const router = useRouter();
	const { signUp } = useAuth();
	const passwordInputRef = React.useRef<TextInput>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	function onEmailSubmitEditing() {
		passwordInputRef.current?.focus();
	}

	function onPasswordSubmitEditing() {
		form.handleSubmit(onSubmit)();
	}

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			await signUp(data.email, data.password);
			form.reset();
		} catch (error: Error | any) {
			console.error(error.message);
		}
	}

	return (
		<View className="gap-6">
			<Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
				<CardHeader>
					<CardTitle className="text-center text-xl sm:text-left">
						Create your account
					</CardTitle>
					<CardDescription className="text-center sm:text-left">
						Welcome! Please fill in the details to get started.
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
										onSubmitEditing={onEmailSubmitEditing}
										returnKeyType="next"
										{...field}
									/>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<PasswordInput
										label="Password"
										placeholder="Password"
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
									<Text>Continue</Text>
								)}
							</Button>
						</View>
					</Form>
					<Text className="text-center text-sm">
						Already have an account?{" "}
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
					<View className="flex-row items-center">
						<Separator className="flex-1" />
						<Text className="text-muted-foreground px-4 text-sm">or</Text>
						<Separator className="flex-1" />
					</View>
					<SocialConnections />
				</CardContent>
			</Card>
		</View>
	);
}
