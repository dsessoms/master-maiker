const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/.expo/**",
			"**/.expo-shared/**",
			"**/android/**",
			"**/ios/**",
			"**/scripts/**",
			"**/*.config.js",
			"metro.config.js",
			"babel.config.js",
			"jest.config.js",
			"tailwind.config.js",
			"web-accessibility-fix.js",
		],
	},
	...expoConfig,
	eslintPluginPrettierRecommended,
]);
