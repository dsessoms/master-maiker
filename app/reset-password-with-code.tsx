import { ScrollView, View } from "react-native";

import { ResetPasswordWithCodeForm } from "@/components/reset-password-with-code-form";
import { SafeAreaView } from "@/components/safe-area-view";

export default function ResetPasswordWithCodeScreen() {
	return (
		<ScrollView
			className="bg-background"
			keyboardShouldPersistTaps="handled"
			contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
			keyboardDismissMode="interactive"
		>
			<View className="w-full max-w-sm">
				<ResetPasswordWithCodeForm />
			</View>
		</ScrollView>
	);
}
