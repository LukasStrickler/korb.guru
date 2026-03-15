import { SignOutButton } from "@/components/sign-out-button";
import {
  ApiError,
  deleteAccount,
  fetchExamples,
  fetchMe,
  getApiBaseUrl,
} from "@/lib/api";
import type { ExampleItem } from "@korb/contracts";
import { identifyUser } from "@/lib/posthog";
import { useAuth } from "@clerk/clerk-expo";
import { useClerk } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

export function HomeAuthGate() {
  return (
    <>
      <AuthLoading>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 items-center justify-center p-6">
            <ActivityIndicator size="large" color="#0a7ea4" />
            <Text className="mt-4 text-base text-gray-500">
              Connecting to Convex…
            </Text>
          </View>
        </SafeAreaView>
      </AuthLoading>
      <Unauthenticated>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 items-center justify-center p-6 gap-4">
            <Text className="text-center text-base text-gray-700">
              We couldn&apos;t load your account. Sign out and try again.
            </Text>
            <SignOutButton />
          </View>
        </SafeAreaView>
      </Unauthenticated>
      <Authenticated>
        <HomeContent />
      </Authenticated>
    </>
  );
}

/** Main home content. Only mounted when Convex has validated the Clerk token (Authenticated). */
function HomeContent() {
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
  const [examples, setExamples] = useState<ExampleItem[] | null>(null);
  const [examplesLoad, setExamplesLoad] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [examplesError, setExamplesError] = useState<string | null>(null);

  // Sync Clerk user to Convex as soon as we're signed in and getCurrent has resolved.
  // When user === null we still sync to create the Convex row (avoids "User not found" on setHandle).
  useEffect(() => {
    if (!clerkUserId || user === undefined) return;
    syncFromClerk().catch(console.error);
  }, [clerkUserId, user, syncFromClerk]);

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
      const msg = e instanceof Error ? e.message : "Failed to set handle";
      setHandleError(
        msg === "Not authenticated"
          ? "Your session expired. Sign out and try again."
          : msg,
      );
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

  const canSaveHandle = handleInput.trim().length > 0;

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
          {user?.name != null && (
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
                disabled={!canSaveHandle || isSettingHandle}
                className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${!canSaveHandle || isSettingHandle ? "opacity-60" : ""} active:opacity-90`}
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

          <View className="gap-2">
            <Text className="text-sm font-semibold text-gray-700">
              Example from DB
            </Text>
            <Pressable
              onPress={async () => {
                setExamplesLoad("loading");
                setExamplesError(null);
                setExamples(null);
                try {
                  const data = await fetchExamples();
                  setExamples(data);
                  setExamplesLoad("ok");
                } catch (e) {
                  setExamplesLoad("error");
                  const raw =
                    e instanceof ApiError && e.detail
                      ? e.detail
                      : e instanceof Error
                        ? e.message
                        : "Request failed";
                  const is503Db =
                    e instanceof ApiError &&
                    e.status === 503 &&
                    (raw.toLowerCase().includes("database") ||
                      raw.toLowerCase().includes("connection refused"));
                  const isNetwork =
                    raw === "Network request failed" ||
                    raw.toLowerCase().includes("network");
                  const baseUrl = (() => {
                    try {
                      return getApiBaseUrl();
                    } catch {
                      return "EXPO_PUBLIC_API_BASE_URL not set";
                    }
                  })();
                  setExamplesError(
                    is503Db
                      ? "Postgres not running. Run: pnpm db:up then pnpm db:migrate (and pnpm db:seed:postgres for example data)."
                      : isNetwork
                        ? `Can't reach ${baseUrl}. Start API first: pnpm dev:backend (or pnpm dev:api). Then retry.`
                        : raw,
                  );
                }
              }}
              disabled={examplesLoad === "loading"}
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 active:opacity-80"
            >
              {examplesLoad === "loading" ? (
                <ActivityIndicator size="small" color="#0a7ea4" />
              ) : (
                <Text className="text-center text-base text-gray-700">
                  Load examples from API (Postgres)
                </Text>
              )}
            </Pressable>
            {examplesLoad === "ok" && examples && examples.length > 0 && (
              <View className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <Text className="text-xs font-medium text-gray-500 mb-1">
                  From example table:
                </Text>
                {examples.map((row) => (
                  <Text key={row.id} className="text-sm text-gray-800">
                    {row.id}: {row.name}
                  </Text>
                ))}
              </View>
            )}
            {examplesLoad === "ok" && examples && examples.length === 0 && (
              <Text className="text-sm text-gray-500">
                No rows. Run pnpm db:seed:postgres.
              </Text>
            )}
            {examplesLoad === "error" && examplesError && (
              <Text className="text-sm text-red-600">{examplesError}</Text>
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

export default function HomeScreen() {
  return <HomeAuthGate />;
}
