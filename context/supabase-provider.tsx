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

type AuthState = {
	initialized: boolean;
	session: Session | null;
	signUp: (email: string, password: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	confirmPasswordReset: (newPassword: string) => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	signUp: async () => {},
	signIn: async () => {},
	signOut: async () => {},
	resetPassword: async () => {},
	confirmPasswordReset: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
	const [initialized, setInitialized] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const router = useRouter();
	const pathname = usePathname();

	const signUp = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			console.error("Error signing up:", error);
			return;
		}

		if (data.session) {
			setSession(data.session);
			console.log("User signed up:", data.user);
		} else {
			console.log("No user returned from sign up");
		}
	};

	const signIn = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			console.error("Error signing in:", error);
			return;
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
					router.replace("/");
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
				signUp,
				signIn,
				signOut,
				resetPassword,
				confirmPasswordReset,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
