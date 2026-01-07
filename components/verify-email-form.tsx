import * as React from "react";
import * as z from "zod";

import { ActivityIndicator, type TextStyle, View } from "react-native";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Form, FormField, FormInput } from "@/components/ui/form";
import { Text } from "@/components/ui/text";
import { AlertCircleIcon } from "@/lib/icons";
import { useAuth } from "@/context/supabase-provider";
import { useForm } from "react-hook-form";
import { useRouter } from "expo-router";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

const RESEND_CODE_INTERVAL_SECONDS = 30;

const TABULAR_NUMBERS_STYLE: TextStyle = { fontVariant: ["tabular-nums"] };

const formSchema = z.object({
	code: z
		.string()
		.length(6, "Verification code must be 6 digits.")
		.regex(/^\d+$/, "Verification code must contain only numbers."),
});

const ErrorAlert = ({ message }: { message?: string }) => (
	<Alert variant="destructive" icon={AlertCircleIcon}>
		<AlertTitle>
			{message ||
				"Failed to verify email. Please check the code and try again."}
		</AlertTitle>
	</Alert>
);

export function VerifyEmailForm() {
	const router = useRouter();
	const { emailToVerify, verifyEmailWithOtp, resendConfirmationEmail } =
		useAuth();
	const [verifyError, setVerifyError] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | undefined>();
	const { countdown, restartCountdown } = useCountdown(
		RESEND_CODE_INTERVAL_SECONDS,
	);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			code: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			setVerifyError(false);
			setErrorMessage(undefined);

			if (!emailToVerify) {
				setVerifyError(true);
				setErrorMessage("No email found. Please sign up again.");
				return;
			}

			await verifyEmailWithOtp(emailToVerify, data.code);
			form.reset();
			router.replace("/(tabs)/(meal-plan)/meal-plan");
		} catch (error: any) {
			console.error("Error verifying email:", error);
			setVerifyError(true);
			setErrorMessage(
				error.message ||
					"Failed to verify email. Please check the code and try again.",
			);
		}
	}

	async function handleResendCode() {
		try {
			await resendConfirmationEmail();
			restartCountdown();
		} catch (error: any) {
			console.error("Error resending code:", error);
			setVerifyError(true);
			setErrorMessage("Failed to resend code. Please try again.");
		}
	}

	return (
		<View className="gap-6">
			<Card className="border-border/0 sm:border-border pb-4 shadow-none sm:shadow-sm sm:shadow-black/5">
				<CardHeader>
					<CardTitle className="text-center text-xl sm:text-left">
						Verify your email
					</CardTitle>
					<CardDescription className="text-center sm:text-left">
						{emailToVerify
							? `Enter the verification code sent to ${emailToVerify}`
							: "Enter the verification code sent to your email"}
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-6">
					{verifyError && <ErrorAlert message={errorMessage} />}
					<Form {...form}>
						<View className="gap-6">
							<FormField
								control={form.control}
								name="code"
								render={({ field }) => (
									<FormInput
										label="Verification code"
										keyboardType="numeric"
										autoComplete="sms-otp"
										textContentType="oneTimeCode"
										autoCapitalize="none"
										returnKeyType="send"
										onSubmitEditing={form.handleSubmit(onSubmit)}
										{...field}
									/>
								)}
							/>
							<Button
								variant="link"
								size="sm"
								disabled={countdown > 0}
								onPress={handleResendCode}
							>
								<Text className="text-center text-xs">
									Didn&apos;t receive the code? Resend{" "}
									{countdown > 0 ? (
										<Text className="text-xs" style={TABULAR_NUMBERS_STYLE}>
											({countdown})
										</Text>
									) : null}
								</Text>
							</Button>
							<View className="gap-3">
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
								<Button
									variant="link"
									className="mx-auto"
									onPress={() => {
										router.replace("/sign-up");
									}}
								>
									<Text>Cancel</Text>
								</Button>
							</View>
						</View>
					</Form>
				</CardContent>
			</Card>
		</View>
	);
}

function useCountdown(seconds = 30) {
	const [countdown, setCountdown] = React.useState(seconds);
	const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

	const startCountdown = React.useCallback(() => {
		setCountdown(seconds);

		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		intervalRef.current = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	}, [seconds]);

	React.useEffect(() => {
		startCountdown();

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [startCountdown]);

	return { countdown, restartCountdown: startCountdown };
}
