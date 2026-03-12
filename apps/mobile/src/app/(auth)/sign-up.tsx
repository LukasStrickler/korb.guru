import { Redirect } from "expo-router";

/**
 * Sign-in and sign-up use the same unified auth screen.
 * Redirect to (auth) so both routes show the same flow.
 */
export default function SignUpRedirect() {
  return <Redirect href="/(auth)" />;
}
