import { SignOutButton } from "@/components/sign-out-button";
import {
  addBudgetEntry,
  ApiError,
  deleteAccount,
  deleteNotification,
  fetchExamples,
  fetchMe,
  getApiBaseUrl,
  getHealthStreak,
  getMessages,
  getNotifications,
  getWeeklySummary,
  incrementHealthStreak,
  markNotificationRead,
  scanReceipt,
  sendMessage,
  type AppNotification,
  type Message,
  type ReceiptItem,
  type WeeklySummary,
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
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

  // Health streak
  const [streakDays, setStreakDays] = useState(0);
  const [incrementingStreak, setIncrementingStreak] = useState(false);

  const loadStreak = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getHealthStreak(token);
      setStreakDays(data.health_streak_days);
    } catch {
      // ignore
    }
  }, [getToken]);

  const onIncrementStreak = async () => {
    setIncrementingStreak(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await incrementHealthStreak(token);
      setStreakDays(data.health_streak_days);
    } catch {
      // ignore
    } finally {
      setIncrementingStreak(false);
    }
  };

  // Budget
  const [budget, setBudget] = useState<WeeklySummary | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const loadBudget = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getWeeklySummary(token);
      setBudget(data);
    } catch {
      // ignore
    }
  }, [getToken]);

  const onAddExpense = async () => {
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAddingExpense(true);
    try {
      const token = await getToken();
      if (!token) return;
      await addBudgetEntry(token, amount, expenseDesc.trim() || "Expense");
      setExpenseAmount("");
      setExpenseDesc("");
      setShowExpenseForm(false);
      await loadBudget();
    } catch {
      // ignore
    } finally {
      setAddingExpense(false);
    }
  };

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getNotifications(token);
      setNotifications(data);
    } catch {
      // ignore
    }
  }, [getToken]);

  const onMarkRead = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await markNotificationRead(token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch {
      // ignore
    }
  };

  const onDeleteNotification = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteNotification(token, id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  // Chat
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getMessages(token);
      setMessages(data);
    } catch {
      // ignore
    }
  }, [getToken]);

  const onSendMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setSendingMsg(true);
    try {
      const token = await getToken();
      if (!token) return;
      await sendMessage(token, text);
      setChatInput("");
      await loadMessages();
    } catch {
      // ignore
    } finally {
      setSendingMsg(false);
    }
  };

  // Receipt scanner
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptRetailer, setReceiptRetailer] = useState("Migros");
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { name: "", price: 0, quantity: 1 },
  ]);
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState<string | null>(null);

  const addReceiptRow = () => {
    setReceiptItems((prev) => [...prev, { name: "", price: 0, quantity: 1 }]);
  };

  const updateReceiptItem = (
    index: number,
    field: keyof ReceiptItem,
    value: string,
  ) => {
    setReceiptItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "name" ? value : parseFloat(value) || 0,
            }
          : item,
      ),
    );
  };

  const receiptTotal = receiptItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );

  const onSubmitReceipt = async () => {
    const validItems = receiptItems.filter((i) => i.name.trim() && i.price > 0);
    if (validItems.length === 0) return;
    setSubmittingReceipt(true);
    try {
      const token = await getToken();
      if (!token) return;
      await scanReceipt(token, receiptRetailer, validItems, receiptTotal);
      setReceiptSuccess(`Receipt logged: CHF ${receiptTotal.toFixed(2)}`);
      setReceiptItems([{ name: "", price: 0, quantity: 1 }]);
      setShowReceipt(false);
      await loadBudget();
      setTimeout(() => setReceiptSuccess(null), 3000);
    } catch {
      // ignore
    } finally {
      setSubmittingReceipt(false);
    }
  };

  // Sync Clerk user to Convex as soon as we're signed in and getCurrent has resolved.
  // When user === null we still sync to create the Convex row (avoids "User not found" on setHandle).
  useEffect(() => {
    if (!clerkUserId || user === undefined) return;
    syncFromClerk().catch(console.error);
  }, [clerkUserId, user, syncFromClerk]);

  useEffect(() => {
    if (clerkUserId) {
      identifyUser(clerkUserId);
      loadStreak();
      loadBudget();
      loadNotifications();
    }
  }, [clerkUserId, loadStreak, loadBudget, loadNotifications]);

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

          {/* Health Streak */}
          <View className="rounded-xl border border-orange-200 bg-orange-50 p-4 gap-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-gray-900">
                  {streakDays} day{streakDays !== 1 ? "s" : ""}
                </Text>
                <Text className="text-sm text-gray-600">
                  {streakDays >= 30
                    ? "Amazing dedication!"
                    : streakDays >= 14
                      ? "Two weeks strong!"
                      : streakDays >= 7
                        ? "One week streak!"
                        : "Healthy eating streak"}
                </Text>
              </View>
              <Text className="text-4xl">{streakDays >= 7 ? "🔥" : "💪"}</Text>
            </View>
            <Pressable
              onPress={onIncrementStreak}
              disabled={incrementingStreak}
              className={`rounded-xl bg-orange-500 py-2.5 items-center ${incrementingStreak ? "opacity-60" : ""} active:opacity-90`}
            >
              {incrementingStreak ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-sm">
                  Log Healthy Day
                </Text>
              )}
            </Pressable>
          </View>

          {/* Budget Widget */}
          {budget && (
            <View className="rounded-xl border border-gray-200 bg-white p-4 gap-3">
              <Text className="text-lg font-semibold text-gray-900">
                Weekly Budget
              </Text>
              <View className="h-3 rounded-full bg-gray-200 overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    budget.weekly_limit > 0 &&
                    budget.spent_this_week / budget.weekly_limit > 0.9
                      ? "bg-red-500"
                      : budget.weekly_limit > 0 &&
                          budget.spent_this_week / budget.weekly_limit > 0.6
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{
                    width: `${budget.weekly_limit > 0 ? Math.min(100, (budget.spent_this_week / budget.weekly_limit) * 100) : 0}%`,
                  }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-600">
                  CHF {budget.spent_this_week.toFixed(2)} /{" "}
                  {budget.weekly_limit.toFixed(2)}
                </Text>
                <Text className="text-sm font-semibold text-green-700">
                  CHF {budget.remaining.toFixed(2)} left
                </Text>
              </View>
              {receiptSuccess && (
                <Text className="text-sm text-green-600">{receiptSuccess}</Text>
              )}
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setShowExpenseForm(!showExpenseForm)}
                  className="flex-1 rounded-xl border border-[#0a7ea4] py-2.5 items-center active:opacity-80"
                >
                  <Text className="text-[#0a7ea4] font-semibold text-sm">
                    Add Expense
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowReceipt(true)}
                  className="flex-1 rounded-xl border border-[#0a7ea4] py-2.5 items-center active:opacity-80"
                >
                  <Text className="text-[#0a7ea4] font-semibold text-sm">
                    Log Receipt
                  </Text>
                </Pressable>
              </View>
              {showExpenseForm && (
                <View className="gap-2 border-t border-gray-100 pt-2">
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                    value={expenseAmount}
                    placeholder="Amount (CHF)"
                    placeholderTextColor="#6b7280"
                    onChangeText={setExpenseAmount}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                    value={expenseDesc}
                    placeholder="Description (optional)"
                    placeholderTextColor="#6b7280"
                    onChangeText={setExpenseDesc}
                  />
                  <Pressable
                    onPress={onAddExpense}
                    disabled={addingExpense || !expenseAmount}
                    className={`rounded-xl bg-[#0a7ea4] py-2.5 items-center ${addingExpense || !expenseAmount ? "opacity-60" : ""} active:opacity-90`}
                  >
                    {addingExpense ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white font-semibold text-sm">
                        Save
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Notifications */}
          <View className="rounded-xl border border-gray-200 bg-white p-4 gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-gray-900">
                Notifications
              </Text>
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <View className="rounded-full bg-red-500 px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">
                    {notifications.filter((n) => !n.is_read).length}
                  </Text>
                </View>
              )}
            </View>
            {notifications.length === 0 && (
              <Text className="text-sm text-gray-400 py-2">
                No notifications
              </Text>
            )}
            {notifications.slice(0, 5).map((notif) => (
              <Pressable
                key={notif.id}
                onPress={() => !notif.is_read && onMarkRead(notif.id)}
                onLongPress={() => onDeleteNotification(notif.id)}
                className={`rounded-lg p-3 ${notif.is_read ? "bg-gray-50" : "bg-blue-50 border-l-4 border-blue-400"}`}
              >
                <Text
                  className={`text-sm ${notif.is_read ? "text-gray-600" : "text-gray-900 font-medium"}`}
                >
                  {notif.text}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  {new Date(notif.created_at).toLocaleDateString()}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Household Chat button */}
          <Pressable
            onPress={() => {
              loadMessages();
              setShowChat(true);
            }}
            className="rounded-xl border border-gray-200 bg-white p-4 active:opacity-80"
          >
            <Text className="text-lg font-semibold text-gray-900">
              Household Chat
            </Text>
            <Text className="text-sm text-gray-500">
              Message your household members
            </Text>
          </Pressable>

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

      {/* Chat Modal */}
      <Modal
        visible={showChat}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChat(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl h-3/4 flex">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-900">
                Household Chat
              </Text>
              <Pressable onPress={() => setShowChat(false)}>
                <Text className="text-[#0a7ea4] font-semibold">Close</Text>
              </Pressable>
            </View>
            <ScrollView className="flex-1 p-4">
              {messages.length === 0 && (
                <Text className="text-sm text-gray-400 text-center py-8">
                  No messages yet
                </Text>
              )}
              {messages.map((msg) => {
                const isOwn = msg.user_id === clerkUserId;
                return (
                  <View
                    key={msg.id}
                    className={`mb-2 max-w-[80%] ${isOwn ? "self-end" : "self-start"}`}
                  >
                    {!isOwn && msg.username && (
                      <Text className="text-xs text-gray-500 mb-0.5">
                        {msg.username}
                      </Text>
                    )}
                    <View
                      className={`rounded-xl px-3 py-2 ${isOwn ? "bg-[#0a7ea4]" : "bg-gray-100"}`}
                    >
                      <Text
                        className={`text-sm ${isOwn ? "text-white" : "text-gray-900"}`}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View className="flex-row gap-2 p-4 border-t border-gray-200">
              <TextInput
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                value={chatInput}
                placeholder="Type a message..."
                placeholderTextColor="#6b7280"
                onChangeText={setChatInput}
                onSubmitEditing={onSendMessage}
                returnKeyType="send"
              />
              <Pressable
                onPress={onSendMessage}
                disabled={sendingMsg || !chatInput.trim()}
                className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${sendingMsg || !chatInput.trim() ? "opacity-60" : ""} active:opacity-90`}
              >
                {sendingMsg ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Scanner Modal */}
      <Modal
        visible={showReceipt}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReceipt(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl max-h-[85%]">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-900">
                Log Receipt
              </Text>
              <Pressable onPress={() => setShowReceipt(false)}>
                <Text className="text-[#0a7ea4] font-semibold">Cancel</Text>
              </Pressable>
            </View>
            <ScrollView className="p-4">
              <View className="gap-3">
                <View className="gap-1">
                  <Text className="text-sm font-medium text-gray-700">
                    Retailer
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {["Migros", "Coop", "Aldi", "Denner", "Lidl"].map((r) => (
                        <Pressable
                          key={r}
                          onPress={() => setReceiptRetailer(r)}
                          className={`rounded-full px-4 py-2 border ${
                            receiptRetailer === r
                              ? "bg-[#0a7ea4] border-[#0a7ea4]"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              receiptRetailer === r
                                ? "text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {r}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <Text className="text-sm font-medium text-gray-700">Items</Text>
                {receiptItems.map((item, idx) => (
                  <View key={idx} className="flex-row gap-2">
                    <TextInput
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white"
                      value={item.name}
                      placeholder="Item name"
                      placeholderTextColor="#6b7280"
                      onChangeText={(v) => updateReceiptItem(idx, "name", v)}
                    />
                    <TextInput
                      className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white text-right"
                      value={item.price ? String(item.price) : ""}
                      placeholder="CHF"
                      placeholderTextColor="#6b7280"
                      onChangeText={(v) => updateReceiptItem(idx, "price", v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
                <Pressable
                  onPress={addReceiptRow}
                  className="rounded-xl border border-dashed border-gray-300 py-2 items-center active:opacity-80"
                >
                  <Text className="text-sm text-gray-500">+ Add Item</Text>
                </Pressable>

                <View className="flex-row justify-between items-center border-t border-gray-200 pt-3">
                  <Text className="text-base font-semibold text-gray-900">
                    Total
                  </Text>
                  <Text className="text-lg font-bold text-gray-900">
                    CHF {receiptTotal.toFixed(2)}
                  </Text>
                </View>

                <Pressable
                  onPress={onSubmitReceipt}
                  disabled={submittingReceipt}
                  className={`rounded-xl bg-[#0a7ea4] py-3 items-center ${submittingReceipt ? "opacity-60" : ""} active:opacity-90`}
                >
                  {submittingReceipt ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">
                      Submit Receipt
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return <HomeAuthGate />;
}
