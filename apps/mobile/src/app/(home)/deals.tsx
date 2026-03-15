import { ApiError, getDeals, type ProductSearchResult } from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function DealCard({ deal }: { deal: ProductSearchResult }) {
  const hasDiscount = deal.discount_pct != null && deal.discount_pct > 0;
  const originalPrice =
    hasDiscount && deal.price != null
      ? deal.price / (1 - deal.discount_pct! / 100)
      : null;

  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 gap-1">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-base font-semibold text-gray-900 flex-1"
          numberOfLines={2}
        >
          {deal.name}
        </Text>
        {hasDiscount && (
          <View className="ml-2 rounded-full bg-red-100 px-2 py-0.5">
            <Text className="text-xs font-bold text-red-700">
              -{deal.discount_pct}%
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-gray-500">{deal.retailer}</Text>
      <View className="flex-row items-center gap-2 mt-1">
        {originalPrice != null && (
          <Text className="text-sm text-gray-400 line-through">
            CHF {originalPrice.toFixed(2)}
          </Text>
        )}
        {deal.price != null && (
          <Text className="text-lg font-bold text-red-700">
            CHF {deal.price.toFixed(2)}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function DealsScreen() {
  const { getToken } = useAuth();

  const [deals, setDeals] = useState<ProductSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const token = await getToken();
      if (!token) {
        setStatus("error");
        setErrorMsg("Not signed in");
        return;
      }
      const data = await getDeals(token);
      setDeals(data);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(
        e instanceof ApiError && e.detail
          ? e.detail
          : e instanceof Error
            ? e.message
            : "Failed to load deals",
      );
    }
  }, [getToken]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

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
            This Week&apos;s Deals
          </Text>

          {status === "loading" && (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#0a7ea4" />
              <Text className="mt-4 text-base text-gray-500">
                Loading deals...
              </Text>
            </View>
          )}

          {status === "error" && errorMsg && (
            <View className="items-center py-8 gap-3">
              <Text className="text-sm text-red-600 text-center">
                {errorMsg}
              </Text>
              <Pressable
                onPress={loadDeals}
                className="rounded-xl bg-[#0a7ea4] px-4 py-3 active:opacity-90"
              >
                <Text className="text-white font-semibold">Retry</Text>
              </Pressable>
            </View>
          )}

          {status === "ok" && deals.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-base text-gray-500">
                No deals this week
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                Check back later for new offers
              </Text>
            </View>
          )}

          {deals.length > 0 && (
            <View className="gap-3">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
