import React, {
	PropsWithChildren,
	createContext,
	useCallback,
	useContext,
	useState,
} from "react";

import { colors } from "../constants/colors";
import { useColorScheme } from "nativewind";

interface ThemeContextType {
	theme: "light" | "dark";
	toggleTheme: () => void;
	colors: (typeof colors)["light"] | (typeof colors)["dark"];
}

export const ThemeContext = createContext<ThemeContextType>(
	{} as ThemeContextType,
);

export const ThemeContextProvider: React.FC<PropsWithChildren> = ({
	children,
}) => {
	const { setColorScheme } = useColorScheme();
	const [theme, setTheme] = useState<"light" | "dark">("light");

	const toggleTheme = useCallback(() => {
		if (theme === "light") {
			setTheme("dark");
			setColorScheme("dark");
		} else {
			setTheme("light");
			setColorScheme("light");
		}
	}, [theme]);

	return (
		<ThemeContext.Provider
			value={{ theme, toggleTheme, colors: colors[theme] }}
		>
			{children}
		</ThemeContext.Provider>
	);
};

export function useTheme() {
	const { ...values } = useContext(ThemeContext);
	return { ...values };
}
