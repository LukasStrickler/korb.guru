import {
  ApiError,
  batchSearchProducts,
  bulkUpdateGroceryItems,
  createAutoRefillRule,
  createGroceryList,
  getAutoRefillRules,
  getGroceryLists,
  type AutoRefillRule,
  type CompareResult,
  type GroceryItem,
  type GroceryList,
} from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function GroceryItemRow({
  item,
  onToggle,
}: {
  item: GroceryItem;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center gap-3 py-2">
      <View
        className={`w-6 h-6 rounded border-2 items-center justify-center ${
          item.is_checked
            ? "bg-[#0a7ea4] border-[#0a7ea4]"
            : "bg-white border-gray-300"
        }`}
      >
        {item.is_checked && (
          <Text className="text-white text-xs font-bold">✓</Text>
        )}
      </View>
      <Text
        className={`text-base flex-1 ${
          item.is_checked ? "text-gray-400 line-through" : "text-gray-900"
        }`}
      >
        {item.ingredient_name}
      </Text>
      {item.quantity && (
        <Text className="text-sm text-gray-400">{item.quantity}</Text>
      )}
    </Pressable>
  );
}

export default function ListsScreen() {
  const { getToken } = useAuth();

  const [lists, setLists] = useState<GroceryList[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [priceResults, setPriceResults] = useState<Record<
    string,
    CompareResult[]
  > | null>(null);
  const [priceListId, setPriceListId] = useState<string | null>(null);
  const [priceStatus, setPriceStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");

  // New list creation
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  const onCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    setCreatingList(true);
    try {
      const token = await getToken();
      if (!token) return;
      const newList = await createGroceryList(token, name);
      setLists((prev) => [newList, ...prev]);
      setNewListName("");
    } catch {
      // ignore
    } finally {
      setCreatingList(false);
    }
  };

  // Auto-refill rules
  const [refillRules, setRefillRules] = useState<AutoRefillRule[]>([]);
  const [refillIngredient, setRefillIngredient] = useState("");
  const [refillDays, setRefillDays] = useState("7");
  const [addingRule, setAddingRule] = useState(false);

  const loadRefillRules = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getAutoRefillRules(token);
      setRefillRules(data);
    } catch {
      // ignore
    }
  }, [getToken]);

  const onAddRefillRule = async () => {
    const ingredient = refillIngredient.trim();
    if (!ingredient) return;
    setAddingRule(true);
    try {
      const token = await getToken();
      if (!token) return;
      const rule = await createAutoRefillRule(
        token,
        ingredient,
        parseInt(refillDays, 10) || 7,
      );
      setRefillRules((prev) => [...prev, rule]);
      setRefillIngredient("");
      setRefillDays("7");
    } catch {
      // ignore
    } finally {
      setAddingRule(false);
    }
  };

  const findBestPrices = async (list: GroceryList) => {
    const unchecked = list.items.filter((i) => !i.is_checked);
    if (unchecked.length === 0) return;
    setPriceStatus("loading");
    setPriceListId(list.id);
    try {
      const token = await getToken();
      if (!token) return;
      const queries = unchecked.map((i) => i.ingredient_name);
      const data = await batchSearchProducts(token, queries);
      setPriceResults(data);
      setPriceStatus("ok");
    } catch {
      setPriceStatus("error");
    }
  };

  const loadLists = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const token = await getToken();
      if (!token) {
        setStatus("error");
        setErrorMsg("Not signed in");
        return;
      }
      const data = await getGroceryLists(token);
      setLists(data);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(
        e instanceof ApiError && e.detail
          ? e.detail
          : e instanceof Error
            ? e.message
            : "Failed to load lists",
      );
    }
  }, [getToken]);

  useEffect(() => {
    loadLists();
    loadRefillRules();
  }, [loadLists, loadRefillRules]);

  const toggleItem = async (listIndex: number, itemId: string) => {
    const list = lists[listIndex];
    const item = list?.items.find((i) => i.id === itemId);
    if (!item) return;

    const newChecked = !item.is_checked;

    // Check token before optimistic update so we can bail without needing to revert
    const token = await getToken();
    if (!token) return;

    // Optimistic update
    setLists((prev) =>
      prev.map((l, li) =>
        li === listIndex
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, is_checked: newChecked } : i,
              ),
            }
          : l,
      ),
    );

    // Persist to backend
    try {
      await bulkUpdateGroceryItems(token, [
        { item_id: itemId, is_checked: newChecked },
      ]);
    } catch {
      // Revert on failure
      setLists((prev) =>
        prev.map((l, li) =>
          li === listIndex
            ? {
                ...l,
                items: l.items.map((i) =>
                  i.id === itemId ? { ...i, is_checked: !newChecked } : i,
                ),
              }
            : l,
        ),
      );
    }
  };

  const groupByCategory = (items: GroceryItem[]) => {
    const groups: Record<string, GroceryItem[]> = {};
    for (const item of items) {
      const cat = item.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 32,
        }}
      >
        <View className="gap-4">
          <Text className="text-3xl font-bold text-gray-900">
            Grocery Lists
          </Text>

          {/* Create new list */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
              value={newListName}
              placeholder="New list name..."
              placeholderTextColor="#6b7280"
              onChangeText={setNewListName}
              onSubmitEditing={onCreateList}
              returnKeyType="done"
              autoCapitalize="sentences"
            />
            <Pressable
              onPress={onCreateList}
              disabled={creatingList || !newListName.trim()}
              className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${creatingList || !newListName.trim() ? "opacity-60" : ""} active:opacity-90`}
            >
              {creatingList ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Create</Text>
              )}
            </Pressable>
          </View>

          {status === "loading" && (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#0a7ea4" />
              <Text className="mt-4 text-base text-gray-500">
                Loading lists...
              </Text>
            </View>
          )}

          {status === "error" && errorMsg && (
            <View className="items-center py-8 gap-3">
              <Text className="text-sm text-red-600 text-center">
                {errorMsg}
              </Text>
              <Pressable
                onPress={loadLists}
                className="rounded-xl bg-[#0a7ea4] px-4 py-3 active:opacity-90"
              >
                <Text className="text-white font-semibold">Retry</Text>
              </Pressable>
            </View>
          )}

          {status === "ok" && lists.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-base text-gray-500">
                No grocery lists yet
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                Your lists will appear here
              </Text>
            </View>
          )}

          {lists.map((list, listIndex) => (
            <View
              key={list.id}
              className="rounded-xl border border-gray-200 bg-white p-4 gap-3"
            >
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-gray-900">
                  {list.name}
                </Text>
                {list.estimated_total > 0 && (
                  <Text className="text-sm text-gray-500">
                    ~CHF {list.estimated_total.toFixed(2)}
                  </Text>
                )}
              </View>
              {groupByCategory(list.items).map(([category, items]) => (
                <View key={category} className="gap-1">
                  <Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {category}
                  </Text>
                  {items.map((item) => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(listIndex, item.id)}
                    />
                  ))}
                </View>
              ))}
              {list.items.length === 0 && (
                <Text className="text-sm text-gray-400 text-center py-2">
                  Empty list
                </Text>
              )}
              {list.items.filter((i) => !i.is_checked).length > 0 && (
                <Pressable
                  onPress={() => findBestPrices(list)}
                  disabled={
                    priceStatus === "loading" && priceListId === list.id
                  }
                  className={`rounded-xl bg-[#0a7ea4] py-2.5 items-center mt-1 ${priceStatus === "loading" && priceListId === list.id ? "opacity-60" : ""} active:opacity-90`}
                >
                  {priceStatus === "loading" && priceListId === list.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">
                      Find Best Prices
                    </Text>
                  )}
                </Pressable>
              )}
              {priceStatus === "ok" &&
                priceListId === list.id &&
                priceResults && (
                  <View className="gap-2 mt-2 border-t border-gray-100 pt-2">
                    <Text className="text-sm font-semibold text-gray-700">
                      Best Prices Found
                    </Text>
                    {Object.entries(priceResults).map(
                      ([ingredient, products]) => (
                        <View key={ingredient} className="gap-1">
                          <Text className="text-xs font-medium text-gray-500 uppercase">
                            {ingredient}
                          </Text>
                          {products.length === 0 ? (
                            <Text className="text-xs text-gray-400">
                              No results
                            </Text>
                          ) : (
                            products.slice(0, 3).map((p) => (
                              <View
                                key={p.id}
                                className="flex-row justify-between items-center"
                              >
                                <Text
                                  className="text-sm text-gray-900 flex-1"
                                  numberOfLines={1}
                                >
                                  {p.name}
                                </Text>
                                <Text className="text-xs text-gray-500 mx-2">
                                  {p.retailer}
                                </Text>
                                {p.price != null && (
                                  <Text className="text-sm font-semibold text-gray-900">
                                    CHF {p.price.toFixed(2)}
                                  </Text>
                                )}
                              </View>
                            ))
                          )}
                        </View>
                      ),
                    )}
                  </View>
                )}
            </View>
          ))}
          {/* Auto-Refill Rules */}
          <View className="gap-3 border-t border-gray-200 pt-4 mt-2">
            <Text className="text-lg font-semibold text-gray-900">
              Auto-Refill Rules
            </Text>
            <Text className="text-sm text-gray-500">
              Get reminded to restock ingredients
            </Text>
            {refillRules.map((rule) => (
              <View
                key={rule.id}
                className="flex-row justify-between items-center rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <Text className="text-base text-gray-900">
                  {rule.ingredient_name}
                </Text>
                <Text className="text-sm text-gray-500">
                  every {rule.threshold_days}d
                </Text>
              </View>
            ))}
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                value={refillIngredient}
                placeholder="Ingredient..."
                placeholderTextColor="#6b7280"
                onChangeText={setRefillIngredient}
                autoCapitalize="none"
              />
              <TextInput
                className="w-16 border border-gray-300 rounded-xl px-3 py-3 text-base text-gray-900 bg-white text-center"
                value={refillDays}
                placeholder="Days"
                placeholderTextColor="#6b7280"
                onChangeText={setRefillDays}
                keyboardType="number-pad"
              />
              <Pressable
                onPress={onAddRefillRule}
                disabled={addingRule || !refillIngredient.trim()}
                className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${addingRule || !refillIngredient.trim() ? "opacity-60" : ""} active:opacity-90`}
              >
                {addingRule ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
