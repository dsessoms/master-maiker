// Add custom jest matchers from jest-dom
// import '@testing-library/jest-dom';

// Set up test environment variables
process.env.SPOONACULAR_API_KEY = "test-api-key";

// Mock expo modules if needed
global.jest = jest;

jest.mock("expo-constants", () => ({
	expoConfig: {
		extra: {},
	},
}));
