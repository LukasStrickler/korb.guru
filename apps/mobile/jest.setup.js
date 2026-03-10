/**
 * Runs before test framework and module resolution.
 * Required so babel-preset-expo can inline EXPO_PUBLIC_* at transform time.
 */
if (!process.env["EXPO_PUBLIC_API_BASE_URL"]) {
  process.env["EXPO_PUBLIC_API_BASE_URL"] = "http://test.api";
}
