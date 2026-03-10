import "../../global.css";

import { Stack } from "expo-router";

import { clerkConfig, ClerkProvider, tokenCache } from "@/lib/clerk";
import { ConvexClientProvider } from "@/lib/convex";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { assertProductionEnv } from "@/lib/env";
import { usePostHog } from "@/lib/posthog";

assertProductionEnv();

const isStorybookEnv = process.env["EXPO_PUBLIC_ENVIRONMENT"] === "storybook";

export default function RootLayout() {
  if (isStorybookEnv) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="storybook" options={{ headerShown: false }} />
      </Stack>
    );
  }

  usePostHog();
  return (
    <ClerkProvider
      publishableKey={clerkConfig.publishableKey}
      tokenCache={tokenCache}
    >
      <ConvexClientProvider>
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={__DEV__}>
              <Stack.Screen name="storybook" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </ErrorBoundary>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
