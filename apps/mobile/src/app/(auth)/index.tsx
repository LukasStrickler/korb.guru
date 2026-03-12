import {
  useAuth,
  useSignIn,
  useSignInWithApple,
  useSignUp,
} from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type Flow = "email" | "code";
type FlowErrors = { fields?: Record<string, { message: string }> };

type EmailCodeFactor = {
  strategy: "email_code";
  emailAddressId: string;
};

type EmailCodeSignIn = {
  status: string | null;
  createdSessionId?: string | null;
  supportedFirstFactors?: Array<{ strategy: string; emailAddressId?: string }>;
  create: (args: { identifier: string }) => Promise<EmailCodeSignIn>;
  prepareFirstFactor: (args: {
    strategy: "email_code";
    emailAddressId: string;
  }) => Promise<EmailCodeSignIn>;
  attemptFirstFactor: (args: {
    strategy: "email_code";
    code: string;
  }) => Promise<EmailCodeSignIn>;
};

type EmailCodeSignUp = {
  status: string | null;
  createdSessionId?: string | null;
  create: (args: { emailAddress: string }) => Promise<{ error?: unknown }>;
  prepareEmailAddressVerification: (args?: {
    strategy: "email_code";
  }) => Promise<unknown>;
  attemptEmailAddressVerification: (args: { code: string }) => Promise<unknown>;
};

type SetActive = (args: { session: string }) => Promise<void>;

type ClerkFlowError = {
  code?: string;
  errors?: Array<{ code?: string }>;
};

function getClerkFlowCode(error: unknown): string | undefined {
  const candidate = error as ClerkFlowError | undefined;
  return candidate?.errors?.[0]?.code ?? candidate?.code;
}

/** Extract a short message for logging or UI from Clerk/sign-in errors. */
function getErrorMessage(error: unknown): string {
  if (error == null) return "Unknown error";
  if (error instanceof Error) return error.message || "Unknown error";
  const o = error as {
    message?: string;
    longMessage?: string;
    code?: string;
    errors?: Array<{ message?: string; longMessage?: string; code?: string }>;
  };
  if (typeof o?.message === "string" && o.message.trim()) return o.message;
  if (typeof o?.longMessage === "string" && o.longMessage.trim())
    return o.longMessage;
  const first = o?.errors?.[0];
  if (first) {
    const m = first.longMessage ?? first.message;
    if (typeof m === "string" && m.trim()) return m;
    if (typeof first.code === "string") return first.code;
  }
  if (typeof o?.code === "string") return o.code;
  if (typeof o === "object") {
    const json = JSON.stringify(o);
    if (json && json !== "{}") return json;
  }
  const s = String(error);
  return s && s !== "[object Object]" ? s : "Unknown error";
}

function isIdentifierNotFoundError(error: unknown): boolean {
  const formCode = getClerkFlowCode(error);
  return (
    formCode === "form_identifier_not_found" ||
    formCode === "user_not_found" ||
    (typeof formCode === "string" &&
      formCode.toLowerCase().includes("not_found"))
  );
}

async function sendSignUpEmailCode(signUp: EmailCodeSignUp): Promise<void> {
  await signUp.prepareEmailAddressVerification({
    strategy: "email_code",
  });
}

async function verifySignUpEmailCode(
  signUp: EmailCodeSignUp,
  code: string,
): Promise<unknown> {
  return signUp.attemptEmailAddressVerification({ code });
}

async function completeClerkFlow({
  attempt,
  setActive,
  doNavigate,
}: {
  attempt: { createdSessionId?: string | null };
  setActive: SetActive;
  doNavigate: (url: string) => void;
}): Promise<void> {
  if (!attempt.createdSessionId) {
    throw new Error("Clerk auth flow completed without a created session id");
  }

  await setActive({ session: attempt.createdSessionId });
  doNavigate("/");
}

export default function AuthScreen() {
  const { isSignedIn } = useAuth();
  const {
    isLoaded: isSignInLoaded,
    signIn,
    setActive,
    errors: signInErrors,
    fetchStatus: signInStatus,
  } = useSignIn() as unknown as {
    isLoaded: boolean;
    signIn: EmailCodeSignIn | null;
    setActive: SetActive;
    errors?: FlowErrors;
    fetchStatus: "idle" | "fetching";
  };
  const {
    isLoaded: isSignUpLoaded,
    signUp,
    errors: signUpErrors,
    fetchStatus: signUpStatus,
  } = useSignUp() as unknown as {
    isLoaded: boolean;
    signUp: EmailCodeSignUp | null;
    errors?: FlowErrors;
    fetchStatus: "idle" | "fetching";
  };
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [code, setCode] = React.useState("");
  const [flow, setFlow] = React.useState<Flow>("email");
  const [isSignUpFlow, setIsSignUpFlow] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const doNavigate = React.useCallback(
    (url: string) => {
      if (typeof window !== "undefined" && url.startsWith("http")) {
        (window as unknown as { location: { href: string } }).location.href =
          url;
      } else {
        router.replace(url as Href);
      }
    },
    [router],
  );

  const startSignUpEmailCodeFlow = React.useCallback(
    async (email: string) => {
      if (!isSignUpLoaded || !signUp) return false;

      const { error: signUpErr } = await signUp.create({ emailAddress: email });
      if (signUpErr) {
        setAuthError(getErrorMessage(signUpErr));
        return false;
      }

      try {
        await sendSignUpEmailCode(signUp);
      } catch (error) {
        setAuthError(getErrorMessage(error));
        return false;
      }

      setIsSignUpFlow(true);
      setFlow("code");
      return true;
    },
    [isSignUpLoaded, signUp],
  );

  const handleEmailSubmit = async () => {
    if (!isSignInLoaded || !signIn || !emailAddress.trim()) return;
    setAuthError(null);
    const email = emailAddress.trim();

    try {
      const signInAttempt = await signIn.create({ identifier: email });
      const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
        (factor): factor is EmailCodeFactor => factor.strategy === "email_code",
      );

      if (!emailCodeFactor?.emailAddressId) {
        setAuthError("Email code sign-in is not available for this account.");
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailCodeFactor.emailAddressId,
      });
    } catch (error) {
      if (isIdentifierNotFoundError(error)) {
        await startSignUpEmailCodeFlow(email);
      } else {
        setAuthError(getErrorMessage(error));
      }
      return;
    }

    setAuthError(null);
    setIsSignUpFlow(false);
    setFlow("code");
  };

  const handleCodeSubmit = async () => {
    if (isSignUpFlow && signUp) {
      try {
        const signUpAttempt = await verifySignUpEmailCode(signUp, code);
        if (
          typeof signUpAttempt === "object" &&
          signUpAttempt !== null &&
          "status" in signUpAttempt &&
          signUpAttempt.status === "complete"
        ) {
          await completeClerkFlow({
            attempt: signUpAttempt as { createdSessionId?: string | null },
            setActive,
            doNavigate,
          });
        }
      } catch (error) {
        setAuthError(getErrorMessage(error));
        return;
      }
      if (signUp.status === "complete") {
        await completeClerkFlow({
          attempt: signUp,
          setActive,
          doNavigate,
        });
      }
    } else if (isSignInLoaded && signIn) {
      try {
        const signInAttempt = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (signInAttempt.status === "complete") {
          await completeClerkFlow({
            attempt: signInAttempt,
            setActive,
            doNavigate,
          });
        }
      } catch (error) {
        setAuthError(getErrorMessage(error));
      }
      if (signIn.status === "complete") {
        await completeClerkFlow({
          attempt: signIn,
          setActive,
          doNavigate,
        });
      }
    }
  };

  const resendCode = async () => {
    if (isSignUpFlow) {
      if (!signUp) return;
      try {
        await sendSignUpEmailCode(signUp);
      } catch (error) {
        setAuthError(getErrorMessage(error));
      }
    } else {
      await handleEmailSubmit();
    }
  };

  const handleApplePress = async () => {
    try {
      const { createdSessionId, setActive } =
        await startAppleAuthenticationFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        doNavigate("/");
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert("Error", e?.message ?? "Apple sign-in failed");
    }
  };

  if (isSignedIn) {
    return null;
  }

  const errors = isSignUpFlow ? signUpErrors : signInErrors;
  const isFetching = isSignUpFlow
    ? signUpStatus === "fetching"
    : signInStatus === "fetching";

  if (flow === "code") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="flex-grow pt-12 px-6 gap-4">
            <Text className="text-3xl font-bold text-gray-900">
              Check your email
            </Text>
            <Text className="text-base text-gray-500 mb-2">
              We sent a sign-in code to {emailAddress}. Enter it below.
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={code}
              placeholder="Enter code"
              placeholderTextColor="#6b7280"
              onChangeText={(t) => {
                setCode(t);
                setAuthError(null);
              }}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            {(authError || errors?.fields?.["code"]) && (
              <Text className="text-sm text-red-600 -mt-1">
                {authError ?? errors?.fields?.["code"]?.message}
              </Text>
            )}
            <Pressable
              onPress={handleCodeSubmit}
              disabled={isFetching || !code.trim()}
              className={`mt-4 bg-[#0a7ea4] py-3.5 rounded-xl items-center ${isFetching || !code.trim() ? "opacity-60" : ""} active:opacity-90`}
            >
              {isFetching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Verify
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={resendCode}
              disabled={isFetching}
              className="py-3.5 items-center mt-2 active:opacity-90"
            >
              <Text className="text-[#0a7ea4] text-base font-semibold">
                Send new code
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const isNative = Platform.OS === "ios" || Platform.OS === "android";
  const emailError =
    signInErrors?.fields?.["identifier"] ??
    signUpErrors?.fields?.["emailAddress"];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="flex-grow pt-12 px-6 gap-4">
          <Text className="text-3xl font-bold text-gray-900">
            Sign in or create account
          </Text>
          <Text className="text-base text-gray-500 mb-2">
            Enter your email and we'll send you a sign-in code. No password
            needed.
          </Text>

          {isNative && (
            <>
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={handleApplePress}
                  className="bg-black py-3.5 rounded-xl items-center active:opacity-90"
                >
                  <Text className="text-white text-base font-semibold">
                    Continue with Apple
                  </Text>
                </Pressable>
              )}
              <View className="flex-row items-center gap-3 my-2">
                <View className="flex-1 h-px bg-gray-300" />
                <Text className="text-gray-500 text-sm">or</Text>
                <View className="flex-1 h-px bg-gray-300" />
              </View>
            </>
          )}

          <Text className="text-sm font-semibold text-gray-700 mt-2">
            Email address
          </Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
            value={emailAddress}
            placeholder="you@example.com"
            placeholderTextColor="#6b7280"
            onChangeText={(t) => {
              setEmailAddress(t);
              setAuthError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {(emailError || authError) && (
            <Text className="text-sm text-red-600 -mt-1">
              {authError ?? emailError!.message}
            </Text>
          )}

          <Pressable
            onPress={handleEmailSubmit}
            disabled={!emailAddress.trim() || isFetching}
            className={`mt-4 bg-[#0a7ea4] py-3.5 rounded-xl items-center ${!emailAddress.trim() || isFetching ? "opacity-60" : ""} active:opacity-90`}
          >
            {isFetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Send sign-in code
              </Text>
            )}
          </Pressable>

          <View nativeID="clerk-captcha" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
