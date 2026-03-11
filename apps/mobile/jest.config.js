/** Main Jest config: unit + integration; excludes flaky (quarantine) tests. */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "**/__tests__/**/*.unit.test.[jt]s?(x)",
    "**/__tests__/**/*.component.test.[jt]s?(x)",
    "**/__tests__/**/*.integration.test.[jt]s?(x)",
  ],
  testPathIgnorePatterns: [
    "\\.flaky\\.",
    "node_modules",
    "\\.expo",
    "coverage",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@korb/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native/.*|\\.pnpm/.*(expo|react-native|@react-native|@expo|react-navigation|@react-navigation|msw|until-async|@storybook))|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|msw|until-async|@storybook)",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!**/__tests__/**",
    "!**/*.d.ts",
    "!**/expo-env.d.ts",
    "!**/.expo/**",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "html", "json"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testEnvironment: "node",
};
