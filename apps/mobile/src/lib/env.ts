/**
 * Production environment validation.
 * In production builds, fail fast if required client env vars are missing.
 * In dev, we allow placeholders and only warn (see clerk.ts, convex.tsx).
 */
const REQUIRED_PUBLIC_VARS = [
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_CONVEX_URL",
] as const;

const PLACEHOLDER_VALUES = [
  "pk_test_placeholder_key",
  "https://example.convex.cloud",
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.some((p) => value === p);
}

/**
 * Call early in app startup (e.g. root layout). In production, throws if any
 * required public env var is missing or still a placeholder.
 */
export function assertProductionEnv(): void {
  if (__DEV__) return;

  for (const key of REQUIRED_PUBLIC_VARS) {
    const value = process.env[key];
    if (value == null || value === "" || isPlaceholder(value)) {
      throw new Error(
        `Missing or invalid required env in production: ${key}. ` +
          "Set it in your build environment (e.g. EAS secrets, .env for release).",
      );
    }
  }
}
