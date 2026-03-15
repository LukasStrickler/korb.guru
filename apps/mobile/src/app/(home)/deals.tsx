import {
  ApiError,
  getDeals,
  getStores,
  optimizeRoute,
  type ProductSearchResult,
  type RouteResponse,
  type Store,
} from "@/lib/api";
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

  // Stores & Route
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [routeStatus, setRouteStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");

  const loadStores = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getStores(token);
      setStores(data);
    } catch {
      // ignore
    }
  }, [getToken]);

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const onOptimizeRoute = async () => {
    if (selectedStores.size < 2) return;
    setRouteStatus("loading");
    try {
      const token = await getToken();
      if (!token) {
        setRouteStatus("error");
        return;
      }
      const selected = stores
        .filter((s) => selectedStores.has(s.id))
        .map((s) => s.name);
      const result = await optimizeRoute(token, selected);
      setRouteResult(result);
      setRouteStatus("ok");
    } catch {
      setRouteStatus("error");
    }
  };

  const groupedStores = stores.reduce<Record<string, Store[]>>((acc, s) => {
    (acc[s.brand] ??= []).push(s);
    return acc;
  }, {});

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
    loadStores();
  }, [loadDeals, loadStores]);

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

          {/* Store Finder & Route Optimizer */}
          {stores.length > 0 && (
            <View className="gap-3 border-t border-gray-200 pt-4 mt-2">
              <Text className="text-lg font-semibold text-gray-900">
                Nearby Stores
              </Text>
              <Text className="text-sm text-gray-500">
                Select stores to optimize your shopping route
              </Text>
              {Object.entries(groupedStores)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([brand, brandStores]) => (
                  <View key={brand} className="gap-1">
                    <Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      {brand}
                    </Text>
                    {brandStores.map((store) => (
                      <Pressable
                        key={store.id}
                        onPress={() => toggleStore(store.id)}
                        className="flex-row items-center gap-3 py-2"
                      >
                        <View
                          className={`w-5 h-5 rounded border-2 items-center justify-center ${
                            selectedStores.has(store.id)
                              ? "bg-[#0a7ea4] border-[#0a7ea4]"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {selectedStores.has(store.id) && (
                            <Text className="text-white text-[10px] font-bold">
                              ✓
                            </Text>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm text-gray-900">
                            {store.name}
                          </Text>
                          {store.address && (
                            <Text className="text-xs text-gray-400">
                              {store.address}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ))}

              {selectedStores.size >= 2 && (
                <Pressable
                  onPress={onOptimizeRoute}
                  disabled={routeStatus === "loading"}
                  className={`rounded-xl bg-[#0a7ea4] py-3 items-center ${routeStatus === "loading" ? "opacity-60" : ""} active:opacity-90`}
                >
                  {routeStatus === "loading" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">
                      Optimize Route ({selectedStores.size} stores)
                    </Text>
                  )}
                </Pressable>
              )}

              {routeStatus === "ok" && routeResult && (
                <View className="rounded-xl border border-green-200 bg-green-50 p-4 gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-semibold text-gray-900">
                      Optimized Route
                    </Text>
                    <Text className="text-sm text-green-700 font-semibold">
                      ~{routeResult.time} min
                    </Text>
                  </View>
                  {routeResult.stops.map((stop, idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center gap-2 py-1"
                    >
                      <View className="w-6 h-6 rounded-full bg-[#0a7ea4] items-center justify-center">
                        <Text className="text-xs text-white font-bold">
                          {idx + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm text-gray-900">
                          {stop.name}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {stop.task}
                        </Text>
                      </View>
                      {stop.distance > 0 && (
                        <Text className="text-xs text-gray-400">
                          {stop.distance.toFixed(1)} km
                        </Text>
                      )}
                    </View>
                  ))}
                  {routeResult.saved > 0 && (
                    <Text className="text-sm text-green-700 font-semibold text-center mt-1">
                      You save CHF {routeResult.saved.toFixed(2)}!
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
