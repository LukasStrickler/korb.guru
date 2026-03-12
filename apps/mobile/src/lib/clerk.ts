import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import Constants from "expo-constants";

/**
 * Get the Clerk publishable key from environment variables.
 * Uses EXPO_PUBLIC_ prefix for client-side env vars in Expo.
 */
const getClerkPublishableKey = (): string => {
  const key =
    Constants.expoConfig?.extra?.["clerkPublishableKey"] ??
    process.env["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"];

  if (!key) {
    console.warn(
      "Warning: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. " +
        "Authentication will not work. Please set it in your .env file.",
    );
    return "pk_test_placeholder_key";
  }

  return key;
};

export { ClerkProvider, tokenCache };

export const clerkConfig = {
  publishableKey: getClerkPublishableKey(),
  tokenCache,
};
