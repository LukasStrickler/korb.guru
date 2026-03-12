import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

// Only true when you run `pnpm storybook` or `pnpm storybook:ios` (they set EXPO_PUBLIC_ENVIRONMENT=storybook).
// Do not set EXPO_PUBLIC_ENVIRONMENT=storybook in .env or you'll get Storybook instead of the app.
const isStorybookEnv = process.env["EXPO_PUBLIC_ENVIRONMENT"] === "storybook";

/**
 * Root index: send signed-in users to (home), others to (auth).
 * In Storybook env only, redirect to /storybook so we never need ClerkProvider.
 */
export default function IndexScreen() {
  if (isStorybookEnv) {
    return <Redirect href="/storybook" />;
  }

  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(home)" />;
  }

  return <Redirect href="/(auth)" />;
}
