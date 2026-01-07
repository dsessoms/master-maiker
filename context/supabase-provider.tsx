import {
	PropsWithChildren,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";
import { SplashScreen, usePathname, useRouter } from "expo-router";

import { Session } from "@supabase/supabase-js";
import { supabase } from "@/config/supabase";

SplashScreen.preventAutoHideAsync();

const authRoutes = ["/welcome", "/sign-in", "/sign-up", "/forgot-password"];

interface SignUpUserData {
	isExistingAccount: boolean;
}

type AuthState = {
	initialized: boolean;
	session: Session | null;
	emailToVerify: string | null;
	resetEmail: string | null;
	signUp: (email: string, password: string) => Promise<SignUpUserData>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	confirmPasswordReset: (newPassword: string) => Promise<void>;
	verifyOtpAndResetPassword: (
		email: string,
		token: string,
		newPassword: string,
	) => Promise<void>;
	verifyEmailWithOtp: (email: string, token: string) => Promise<void>;
	setEmailToVerify: (email: string | null) => void;
	setResetEmail: (email: string | null) => void;
	resendConfirmationEmail: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	resetEmail: null,
	emailToVerify: null,
	signUp: async () => ({ isExistingAccount: false }),
	signIn: async () => {},
	signOut: async () => {},
	resetPassword: async () => {},
	confirmPasswordReset: async () => {},
	verifyOtpAndResetPassword: async () => {},
	verifyEmailWithOtp: async () => {},
	setResetEmail: () => {},
	setEmailToVerify: () => {},
	resendConfirmationEmail: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
	const [initialized, setInitialized] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const [resetEmail, setResetEmail] = useState<string | null>(null);
	const [emailToVerify, setEmailToVerify] = useState<string | null>(null);
	const router = useRouter();
	const pathname = usePathname();

	const verifyEmailWithOtp = async (email: string, token: string) => {
		const { data, error } = await supabase.auth.verifyOtp({
			token,
			email,
			type: "signup",
		});

		if (error) {
			console.error("Error signing up:", error);
			throw error;
		}

		if (data.session) {
			setSession(data.session);
			console.log("User signed up:", data.user);
		} else {
			console.log("No user returned from sign up", data.user);
		}
	};

	const resendConfirmationEmail = async () => {
		if (!emailToVerify) {
			return;
		}

		const { data, error } = await supabase.auth.resend({
			email: emailToVerify,
			type: "signup",
		});
	};

	const signUp = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			console.error("Error signing up:", error);
			throw error;
		}

		const userData = {
			isExistingAccount: (data.user?.identities?.length || 0) === 0,
		};

		if (data.session) {
			setSession(data.session);
			console.log("User signed up:", data.user);
		} else {
			console.log("No user returned from sign up", data.user);
		}

		return userData;
	};

	const signIn = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			console.error("Error signing in:", error);
			throw error;
		}

		if (data.session) {
			setSession(data.session);
			console.log("User signed in:", data.user);
		} else {
			console.log("No user returned from sign in");
		}
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out:", error);
			return;
		} else {
			console.log("User signed out");
		}
	};

	const resetPassword = async (email: string) => {
		const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${baseUrl}/reset-password`,
		});

		if (error) {
			console.error("Error resetting password:", error);
			throw error;
		} else {
			console.log("Password reset email sent");
		}
	};

	const confirmPasswordReset = async (newPassword: string) => {
		// Check if user is authenticated (should be from the URL tokens)
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			throw new Error(
				"No active session found. Please use the reset link from your email.",
			);
		}

		// Update the password using the authenticated session
		const { error: updateError } = await supabase.auth.updateUser({
			password: newPassword,
		});

		if (updateError) {
			console.error("Error updating password:", updateError);
			throw updateError;
		}

		console.log("Password reset successful");
	};

	const verifyOtpAndResetPassword = async (
		email: string,
		token: string,
		newPassword: string,
	) => {
		// First, verify the OTP token for password recovery
		const { data, error: verifyError } = await supabase.auth.verifyOtp({
			email,
			token,
			type: "recovery",
		});

		if (verifyError) {
			console.error("Error verifying OTP:", verifyError);
			throw verifyError;
		}

		if (!data.session) {
			throw new Error("Failed to create session after OTP verification");
		}

		// Now update the password with the verified session
		const { error: updateError } = await supabase.auth.updateUser({
			password: newPassword,
		});

		if (updateError) {
			console.error("Error updating password:", updateError);
			throw updateError;
		}

		console.log("Password reset with OTP successful");
	};

	const initialize = async () => {
		const sessionResponse = await supabase.auth.getSession();
		setSession(sessionResponse.data.session);
		setInitialized(true);
	};

	useEffect(() => {
		initialize();

		supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});
	}, []);

	useEffect(() => {
		if (initialized) {
			SplashScreen.hideAsync();
			if (session) {
				if (authRoutes.includes(pathname)) {
					router.replace("/(tabs)/(meal-plan)/meal-plan");
				}
			} else {
				if (!authRoutes.includes(pathname)) {
					router.replace("/welcome");
				}
			}
		}
		// eslint-disable-next-line
	}, [initialized, session]);

	return (
		<AuthContext.Provider
			value={{
				initialized,
				session,
				resetEmail,
				emailToVerify,
				signUp,
				signIn,
				signOut,
				resetPassword,
				confirmPasswordReset,
				verifyOtpAndResetPassword,
				verifyEmailWithOtp,
				setResetEmail,
				setEmailToVerify,
				resendConfirmationEmail,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
