import { Bookmark, NotebookText, ShoppingCart, User } from "@/lib/icons";
import { Redirect, Tabs } from "expo-router";

import { MealPlanContextProvider } from "@/context/meal-plan-context";
import React from "react";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/supabase-provider";
import { useColorScheme } from "@/lib/useColorScheme";

export default function TabsLayout() {
	const { colorScheme } = useColorScheme();

	const { initialized, session } = useAuth();

	if (!initialized) {
		return null;
	}

	if (!session) {
		return <Redirect href="/welcome" />;
	}

	return (
		<MealPlanContextProvider>
			<Tabs
				screenOptions={{
					headerShown: false,
					tabBarStyle: {
						backgroundColor:
							colorScheme === "dark"
								? colors.dark.background
								: colors.light.background,
					},
					tabBarActiveTintColor:
						colorScheme === "dark"
							? colors.dark.foreground
							: colors.light.foreground,
					tabBarShowLabel: true,
					tabBarLabelStyle: { fontSize: 8 },
					popToTopOnBlur: true,
				}}
			>
				<Tabs.Screen
					name="(meal-plan)"
					options={{
						title: "Meal Plan",
						tabBarIcon: ({ color }) => <NotebookText size={20} color={color} />,
					}}
				/>
				<Tabs.Screen
					name="(recipes)"
					options={{
						title: "Recipes",
						tabBarIcon: ({ color }) => <Bookmark size={20} color={color} />,
					}}
				/>
				<Tabs.Screen
					name="shopping"
					options={{
						title: "Shopping",
						tabBarIcon: ({ color }) => <ShoppingCart size={20} color={color} />,
					}}
				/>
				<Tabs.Screen
					name="account"
					options={{
						title: "Account",
						tabBarIcon: ({ color }) => <User size={20} color={color} />,
					}}
				/>
			</Tabs>
		</MealPlanContextProvider>
	);
}
