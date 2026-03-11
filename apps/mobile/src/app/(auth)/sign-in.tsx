import { useSignIn } from "@clerk/clerk-expo";
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

import type { UseSignInCustomReturn } from "@/types/clerk-auth";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } =
    useSignIn() as unknown as UseSignInCustomReturn;
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  const handleSubmit = async () => {
    if (!signIn) return;
    const { error } = await signIn.password({
      emailAddress,
      password,
    });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({
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
    } else if (
      (signIn.status === "needs_client_trust" ||
        signIn.status === "needs_second_factor") &&
      signIn.mfa
    ) {
      await signIn.mfa.sendEmailCode();
    }
  };

  const handleVerifyCode = async () => {
    if (!signIn?.mfa) return;
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") {
      await signIn.finalize({
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

  const isFetching = fetchStatus === "fetching";
  const needsMfa =
    signIn?.status === "needs_client_trust" ||
    signIn?.status === "needs_second_factor";

  if (needsMfa && signIn?.mfa) {
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
              Enter the verification code sent to your email.
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
              onPress={handleVerifyCode}
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
          <Text className="text-3xl font-bold text-gray-900">Sign in</Text>
          <Text className="text-base text-gray-500 mb-2">
            Use your email and password.
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
          {errors?.fields?.["identifier"] && (
            <Text className="text-sm text-red-600 -mt-1">
              {errors.fields["identifier"].message}
            </Text>
          )}

          <Text className="text-sm font-semibold text-gray-700 mt-2">
            Password
          </Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
            value={password}
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
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
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text className="text-[15px] text-[#0a7ea4] font-semibold">
                  Sign up
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
