import { ClerkProvider as ExpoClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

/**
 * Secure token cache for Clerk. Uses Expo SecureStore (encrypted storage), as
 * recommended by Clerk for Expo. Equivalent to the SDK's @clerk/clerk-expo/token-cache;
 * we use a custom implementation so tokenCache is always defined (SDK export is
 * undefined on web, which conflicts with exactOptionalPropertyTypes).
 */
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error("Failed to get token from secure store:", err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("Failed to save token to secure store:", err);
    }
  },
};

/**
 * Get the Clerk publishable key from environment variables
 * Uses EXPO_PUBLIC_ prefix for client-side env vars in Expo
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

/** Clerk Provider; use with clerkConfig and tokenCache. */
export const ClerkProvider = ExpoClerkProvider;

export const clerkConfig = {
  publishableKey: getClerkPublishableKey(),
  tokenCache,
};

export { tokenCache };
