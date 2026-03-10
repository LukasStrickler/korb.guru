import { SignOutButton } from "@/components/sign-out-button";
import { ApiError, deleteAccount, fetchMe } from "@/lib/api";
import { identifyUser } from "@/lib/posthog";
import { useAuth } from "@clerk/clerk-expo";
import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const getCurrentRef = makeFunctionReference<
  "query",
  Record<string, never>,
  { _id: string; handle?: string; name: string; email: string } | null
>("users:getCurrent");

const syncFromClerkRef = makeFunctionReference<
  "mutation",
  Record<string, never>,
  string
>("users:syncFromClerk");

const setHandleRef = makeFunctionReference<
  "mutation",
  { handle: string },
  string
>("users:setHandle");

const deleteMyAccountRef = makeFunctionReference<
  "mutation",
  Record<string, never>,
  void
>("users:deleteMyAccount");

export default function HomeScreen() {
  const { getToken, userId: clerkUserId } = useAuth();
  const { signOut } = useClerk();
  const user = useQuery(getCurrentRef, {});
  const syncFromClerk = useMutation(syncFromClerkRef);
  const setHandle = useMutation(setHandleRef);
  const deleteMyAccount = useMutation(deleteMyAccountRef);
  const [handleInput, setHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isSettingHandle, setIsSettingHandle] = useState(false);
  const [apiCheck, setApiCheck] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [apiCheckMessage, setApiCheckMessage] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) return;
    syncFromClerk().catch(console.error);
  }, [user, syncFromClerk]);

  useEffect(() => {
    if (clerkUserId) identifyUser(clerkUserId);
  }, [clerkUserId]);

  useEffect(() => {
    if (user?.handle) setHandleInput(user.handle);
  }, [user?.handle]);

  const onSaveHandle = async () => {
    setHandleError(null);
    const trimmed = handleInput.trim();
    if (!trimmed) return;
    setIsSettingHandle(true);
    try {
      await setHandle({ handle: trimmed });
    } catch (e) {
      setHandleError(e instanceof Error ? e.message : "Failed to set handle");
    } finally {
      setIsSettingHandle(false);
    }
  };

  const onRequestDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "Your account and all associated data will be permanently deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              const token = await getToken();
              if (token) {
                try {
                  await deleteAccount(token);
                } catch {
                  // Backend may not yet implement Clerk user deletion; continue to remove our data
                }
              }
              await deleteMyAccount();
              const { resetUser } = await import("@/lib/posthog");
              resetUser();
              await signOut();
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error
                  ? e.message
                  : "Could not delete account. Try again or sign out.",
                [{ text: "OK" }],
              );
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  if (user === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text className="mt-4 text-base text-gray-500">Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-4">
          <Text className="text-3xl font-bold text-gray-900">Welcome</Text>
          {user?.name && (
            <Text className="text-base text-gray-600">
              {user.name}
              {user.email ? ` · ${user.email}` : ""}
            </Text>
          )}

          <View className="gap-2">
            <Text className="text-sm font-semibold text-gray-700">
              Your handle
            </Text>
            <Text className="text-sm text-gray-500">
              3–30 characters, letters, numbers, and underscores. Others can add
              you via link using this handle.
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                value={handleInput}
                placeholder="e.g. jane_doe"
                placeholderTextColor="#6b7280"
                onChangeText={(t) => {
                  setHandleInput(t);
                  setHandleError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={onSaveHandle}
                disabled={isSettingHandle || !handleInput.trim()}
                className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${isSettingHandle || !handleInput.trim() ? "opacity-60" : ""} active:opacity-90`}
              >
                {isSettingHandle ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
              </Pressable>
            </View>
            {handleError && (
              <Text className="text-sm text-red-600">{handleError}</Text>
            )}
            {user?.handle && !handleError && (
              <Text className="text-sm text-gray-500">
                Your link: korb.guru/add/{user.handle}
              </Text>
            )}
          </View>

          <View className="gap-2">
            <Pressable
              onPress={async () => {
                setApiCheck("loading");
                setApiCheckMessage(null);
                try {
                  const token = await getToken();
                  if (!token) {
                    setApiCheck("error");
                    setApiCheckMessage("Not signed in");
                    return;
                  }
                  const data = await fetchMe(token);
                  setApiCheck("ok");
                  setApiCheckMessage(data.message);
                } catch (e) {
                  setApiCheck("error");
                  const msg =
                    e instanceof ApiError && e.detail
                      ? e.detail
                      : e instanceof Error
                        ? e.message
                        : "Request failed";
                  setApiCheckMessage(msg);
                }
              }}
              disabled={apiCheck === "loading"}
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 active:opacity-80"
            >
              {apiCheck === "loading" ? (
                <ActivityIndicator size="small" color="#0a7ea4" />
              ) : (
                <Text className="text-center text-base text-gray-700">
                  Verify protected API
                </Text>
              )}
            </Pressable>
            {apiCheck === "ok" && apiCheckMessage && (
              <Text className="text-sm text-green-700">{apiCheckMessage}</Text>
            )}
            {apiCheck === "error" && apiCheckMessage && (
              <Text className="text-sm text-red-600">{apiCheckMessage}</Text>
            )}
          </View>

          <View className="gap-2 border-t border-gray-200 pt-4 mt-2">
            <Text className="text-sm font-semibold text-gray-700">Account</Text>
            <Pressable
              onPress={onRequestDeleteAccount}
              disabled={isDeletingAccount}
              className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 active:opacity-90 ${isDeletingAccount ? "opacity-60" : ""}`}
            >
              {isDeletingAccount ? (
                <ActivityIndicator size="small" color="#b91c1c" />
              ) : (
                <Text className="text-center text-base font-medium text-red-700">
                  Delete my account
                </Text>
              )}
            </Pressable>
            <Text className="text-xs text-gray-500">
              Permanently delete your account and data (required for App Store).
            </Text>
          </View>

          <SignOutButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
