import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import type { Href } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { UseSignUpCustomReturn } from "@/types/clerk-auth";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } =
    useSignUp() as unknown as UseSignUpCustomReturn;
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  const handleSubmit = async () => {
    if (!signUp) return;
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return;
    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    if (!signUp) return;
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({
          session,
          decorateUrl,
        }: {
          session: { currentTask?: unknown } | null;
          decorateUrl: (path: string) => string;
        }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (typeof window !== "undefined" && url.startsWith("http")) {
            (
              window as unknown as { location: { href: string } }
            ).location.href = url;
          } else {
            router.replace(url as Href);
          }
        },
      });
    }
  };

  if (signUp?.status === "complete" || isSignedIn) {
    return null;
  }

  const needsVerification =
    signUp?.status === "missing_requirements" &&
    signUp?.unverifiedFields?.includes("email_address") &&
    (signUp?.missingFields?.length ?? 0) === 0;

  const isFetching = fetchStatus === "fetching";

  if (needsVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="flex-grow pt-12 px-6 gap-4">
            <Text className="text-3xl font-bold text-gray-900">
              Verify your account
            </Text>
            <Text className="text-base text-gray-500 mb-2">
              Enter the code we sent to {emailAddress}.
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={code}
              placeholder="Verification code"
              placeholderTextColor="#6b7280"
              onChangeText={setCode}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            {errors?.fields?.["code"] && (
              <Text className="text-sm text-red-600 -mt-1">
                {errors.fields["code"].message}
              </Text>
            )}
            <Pressable
              onPress={handleVerify}
              disabled={isFetching || !code}
              className={`mt-4 bg-[#0a7ea4] py-3.5 rounded-xl items-center ${isFetching || !code ? "opacity-60" : ""} active:opacity-90`}
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
              onPress={() => signUp?.verifications.sendEmailCode()}
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="flex-grow pt-12 px-6 gap-4">
          <Text className="text-3xl font-bold text-gray-900">Sign up</Text>
          <Text className="text-base text-gray-500 mb-2">
            Create an account with your email and a password.
          </Text>

          <Text className="text-sm font-semibold text-gray-700 mt-2">
            Email
          </Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
            value={emailAddress}
            placeholder="you@example.com"
            placeholderTextColor="#6b7280"
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {errors?.fields?.["emailAddress"] && (
            <Text className="text-sm text-red-600 -mt-1">
              {errors.fields["emailAddress"].message}
            </Text>
          )}

          <Text className="text-sm font-semibold text-gray-700 mt-2">
            Password
          </Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
            value={password}
            placeholder="At least 8 characters"
            placeholderTextColor="#6b7280"
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          {errors?.fields?.["password"] && (
            <Text className="text-sm text-red-600 -mt-1">
              {errors.fields["password"].message}
            </Text>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={!emailAddress || !password || isFetching}
            className={`mt-4 bg-[#0a7ea4] py-3.5 rounded-xl items-center ${!emailAddress || !password || isFetching ? "opacity-60" : ""} active:opacity-90`}
          >
            {isFetching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Continue
              </Text>
            )}
          </Pressable>

          <View className="flex-row items-center mt-6 flex-wrap">
            <Text className="text-[15px] text-gray-500">
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text className="text-[15px] text-[#0a7ea4] font-semibold">
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
