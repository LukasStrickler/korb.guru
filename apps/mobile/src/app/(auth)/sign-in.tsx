import { Redirect } from "expo-router";

/**
 * Sign-in and sign-up use the same unified auth screen.
 * Redirect to (auth) so both routes show the same flow.
 */
export default function SignInRedirect() {
  return <Redirect href="/(auth)" />;
}
