import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { SocialConnections } from "@/components/social-connections";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { Form, FormField, FormInput } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/context/supabase-provider";
import * as React from "react";
import {
	ActivityIndicator,
	Pressable,
	type TextInput,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
	password: z
		.string()
		.min(8, "Please enter at least 8 characters.")
		.max(64, "Please enter fewer than 64 characters."),
});

export function SignInForm() {
	const router = useRouter();
	const { signIn } = useAuth();
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

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			await signIn(data.email, data.password);
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
						Sign in to your account
					</CardTitle>
					<CardDescription className="text-center sm:text-left">
						Welcome back! Please sign in to continue
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
							<View>
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<View className="gap-1.5">
											<View className="flex-row items-center">
												<Label htmlFor="password">Password</Label>
												<Button
													variant="link"
													size="sm"
													className="web:h-fit ml-auto h-6 px-1 py-0 sm:h-6"
													onPress={() => {
														router.replace("/forgot-password" as any);
													}}
												>
													<Text className="font-normal leading-4">
														Forgot your password?
													</Text>
												</Button>
											</View>
											<PasswordInput
												placeholder="Password"
												returnKeyType="send"
												onSubmitEditing={() => form.handleSubmit(onSubmit)()}
												{...field}
											/>
										</View>
									)}
								/>
							</View>
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
					<View className="flex-row justify-center items-baseline">
						<Text className="text-sm">Don&apos;t have an account? </Text>
						<Pressable
							onPress={() => {
								router.replace("/sign-up");
							}}
						>
							<Text className="text-sm underline underline-offset-4">
								Sign up
							</Text>
						</Pressable>
					</View>
					{/* <View className="flex-row items-center">
						<Separator className="flex-1" />
						<Text className="text-muted-foreground px-4 text-sm">or</Text>
						<Separator className="flex-1" />
					</View>
					<SocialConnections /> */}
				</CardContent>
			</Card>
		</View>
	);
}
