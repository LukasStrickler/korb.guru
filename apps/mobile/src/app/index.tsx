import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

const isStorybookEnv = process.env["EXPO_PUBLIC_ENVIRONMENT"] === "storybook";

/**
 * Root index: send signed-in users to (home), others to sign-in.
 * In Storybook env, redirect to /storybook so we never need ClerkProvider.
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

  return <Redirect href="/(auth)/sign-in" />;
}
