import { useEffect, useRef } from "react";
import PostHog from "posthog-react-native";
import Constants from "expo-constants";

/**
 * PostHog client instance
 * Lazy-initialized to avoid issues during SSR/build
 */
let posthogClient: PostHog | null = null;

/**
 * Get the PostHog API key from environment variables
 * Uses EXPO_PUBLIC_ prefix for client-side env vars in Expo
 */
const getPostHogApiKey = (): string => {
  const key =
    Constants.expoConfig?.extra?.["posthogApiKey"] ??
    process.env["EXPO_PUBLIC_POSTHOG_API_KEY"];

  if (!key) {
    console.warn(
      "Warning: EXPO_PUBLIC_POSTHOG_API_KEY is not set. " +
        "Analytics will not be tracked. Please set it in your .env file.",
    );
    return "phc_placeholder_key";
  }

  return key;
};

/**
 * Get the PostHog host URL
 * Defaults to the standard PostHog cloud host
 */
const getPostHogHost = (): string => {
  return (
    Constants.expoConfig?.extra?.["posthogHost"] ??
    process.env["EXPO_PUBLIC_POSTHOG_HOST"] ??
    "https://app.posthog.com"
  );
};

/**
 * Initialize the PostHog client
 * Should be called once at app startup
 */
export const initPostHog = async (): Promise<PostHog | null> => {
  if (posthogClient) {
    return posthogClient;
  }

  const apiKey = getPostHogApiKey();
  const host = getPostHogHost();

  // Skip initialization if using placeholder key
  if (apiKey === "phc_placeholder_key") {
    console.warn("PostHog: Skipping initialization (placeholder key)");
    return null;
  }

  try {
    posthogClient = await (
      PostHog as unknown as {
        initAsync: (
          key: string,
          opts: Record<string, unknown>,
        ) => Promise<PostHog>;
      }
    ).initAsync(apiKey, {
      host,
      // Enable automatic screen capture for navigation events
      captureScreenViews: true,
      // Enable automatic app lifecycle events
      captureApplicationLifecycleEvents: true,
      // Enable debug mode in development
      debug: __DEV__,
    });

    console.warn("PostHog: Initialized successfully");
    return posthogClient;
  } catch (error) {
    console.error("PostHog: Failed to initialize:", error);
    return null;
  }
};

/**
 * Get the PostHog client instance
 * Returns null if not initialized
 */
export const getPostHog = (): PostHog | null => {
  return posthogClient;
};

/**
 * Hook to initialize PostHog in a React component
 * Call this in your root App component
 */
export const usePostHog = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initPostHog();
    }
  }, []);

  return { posthog: posthogClient };
};

/**
 * Track an event with PostHog
 * Safe to call even if PostHog is not initialized
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, string | number | boolean | null>,
): void => {
  if (posthogClient) {
    posthogClient.capture(
      eventName,
      properties as
        | Record<string, string | number | boolean | null>
        | undefined,
    );
  } else {
    // In development, log the event instead
    if (__DEV__) {
      console.warn("[Analytics]", eventName, properties);
    }
  }
};

/**
 * Identify a user with PostHog
 * Safe to call even if PostHog is not initialized
 */
export const identifyUser = (
  userId: string,
  properties?: Record<string, string | number | boolean | null>,
): void => {
  if (posthogClient) {
    posthogClient.identify(
      userId,
      properties as
        | Record<string, string | number | boolean | null>
        | undefined,
    );
  } else {
    if (__DEV__) {
      console.warn("[Analytics] Identify:", userId, properties);
    }
  }
};

/**
 * Reset the PostHog user (call on logout)
 * Safe to call even if PostHog is not initialized
 */
export const resetUser = (): void => {
  if (posthogClient) {
    posthogClient.reset();
  } else {
    if (__DEV__) {
      console.warn("[Analytics] Reset user");
    }
  }
};

export default posthogClient;
