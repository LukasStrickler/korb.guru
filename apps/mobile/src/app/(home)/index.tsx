import {
  ApiError,
  askProductQuestion,
  compareProducts,
  getRecommendedProducts,
  searchProducts,
  submitProductFeedback,
  type CompareResult,
  type ProductSearchResult,
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

const RETAILERS = ["All", "Migros", "Coop", "Aldi", "Denner", "Lidl"] as const;

function ProductCard({
  product,
  onFeedback,
}: {
  product: ProductSearchResult;
  onFeedback?: (productId: string, helpful: boolean) => void;
}) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful);
    onFeedback?.(product.id, helpful);
  };

  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 gap-1">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-base font-semibold text-gray-900 flex-1"
          numberOfLines={2}
        >
          {product.name}
        </Text>
        {product.discount_pct != null && product.discount_pct > 0 && (
          <View className="ml-2 rounded-full bg-red-100 px-2 py-0.5">
            <Text className="text-xs font-bold text-red-700">
              -{product.discount_pct}%
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-gray-500">{product.retailer}</Text>
      <View className="flex-row items-center justify-between">
        {product.price != null && (
          <Text className="text-lg font-bold text-gray-900">
            CHF {product.price.toFixed(2)}
          </Text>
        )}
        {onFeedback && (
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleFeedback(true)}
              className={`rounded-lg px-3 py-1.5 ${feedbackGiven === true ? "bg-green-100" : "bg-gray-100"}`}
            >
              <Text
                className={`text-sm ${feedbackGiven === true ? "text-green-700" : "text-gray-500"}`}
              >
                {feedbackGiven === true ? "Liked" : "Like"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleFeedback(false)}
              className={`rounded-lg px-3 py-1.5 ${feedbackGiven === false ? "bg-red-100" : "bg-gray-100"}`}
            >
              <Text
                className={`text-sm ${feedbackGiven === false ? "text-red-700" : "text-gray-500"}`}
              >
                {feedbackGiven === false ? "Disliked" : "Dislike"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const { getToken } = useAuth();

  const [query, setQuery] = useState("");
  const [selectedRetailer, setSelectedRetailer] = useState<string>("All");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recommendations, setRecommendations] = useState<ProductSearchResult[]>(
    [],
  );
  const [recsStatus, setRecsStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiProducts, setAiProducts] = useState<ProductSearchResult[]>([]);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [aiError, setAiError] = useState<string | null>(null);

  const [compareQuery, setCompareQuery] = useState("");
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const [compareStatus, setCompareStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");

  const onCompare = useCallback(async () => {
    const trimmed = compareQuery.trim();
    if (!trimmed) return;
    setCompareStatus("loading");
    try {
      const token = await getToken();
      if (!token) {
        setCompareStatus("error");
        return;
      }
      const data = await compareProducts(token, trimmed);
      setCompareResults(data);
      setCompareStatus("ok");
    } catch {
      setCompareStatus("error");
    }
  }, [compareQuery, getToken]);

  const loadRecommendations = useCallback(async () => {
    setRecsStatus("loading");
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getRecommendedProducts(token);
      setRecommendations(data);
      setRecsStatus("ok");
    } catch {
      setRecsStatus("error");
    }
  }, [getToken]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const onFeedback = useCallback(
    async (productId: string, helpful: boolean) => {
      try {
        const token = await getToken();
        if (!token) return;
        await submitProductFeedback(token, productId, helpful);
      } catch {
        // feedback is best-effort
      }
    },
    [getToken],
  );

  const onSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const token = await getToken();
      if (!token) {
        setStatus("error");
        setErrorMsg("Not signed in");
        return;
      }
      const retailers =
        selectedRetailer === "All" ? undefined : [selectedRetailer];
      const data = await searchProducts(token, trimmed, retailers);
      setResults(data);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(
        e instanceof ApiError && e.detail
          ? e.detail
          : e instanceof Error
            ? e.message
            : "Search failed",
      );
    }
  }, [query, selectedRetailer, getToken]);

  const onAskAI = useCallback(async () => {
    const trimmed = aiQuestion.trim();
    if (!trimmed) return;
    setAiStatus("loading");
    setAiError(null);
    try {
      const token = await getToken();
      if (!token) {
        setAiStatus("error");
        setAiError("Not signed in");
        return;
      }
      const data = await askProductQuestion(token, trimmed);
      setAiAnswer(data.answer);
      setAiProducts(data.products);
      setAiStatus("ok");
    } catch (e) {
      setAiStatus("error");
      setAiError(
        e instanceof ApiError && e.detail
          ? e.detail
          : e instanceof Error
            ? e.message
            : "Request failed",
      );
    }
  }, [aiQuestion, getToken]);

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
          <Text className="text-3xl font-bold text-gray-900">Search</Text>
          <Text className="text-base text-gray-500">
            Find products across Swiss retailers
          </Text>

          {/* Recommendations */}
          {recsStatus === "loading" && (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#0a7ea4" />
              <Text className="mt-2 text-sm text-gray-500">
                Loading recommendations...
              </Text>
            </View>
          )}
          {recsStatus === "ok" && recommendations.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-gray-900">
                For You
              </Text>
              {recommendations.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFeedback={onFeedback}
                />
              ))}
            </View>
          )}

          {/* Search bar */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
              value={query}
              placeholder="Search products..."
              placeholderTextColor="#6b7280"
              onChangeText={setQuery}
              onSubmitEditing={onSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={onSearch}
              disabled={status === "loading" || !query.trim()}
              className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${status === "loading" || !query.trim() ? "opacity-60" : ""} active:opacity-90`}
            >
              {status === "loading" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Search</Text>
              )}
            </Pressable>
          </View>

          {/* Retailer filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {RETAILERS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setSelectedRetailer(r)}
                  className={`rounded-full px-4 py-2 border ${
                    selectedRetailer === r
                      ? "bg-[#0a7ea4] border-[#0a7ea4]"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedRetailer === r ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Results */}
          {status === "error" && errorMsg && (
            <Text className="text-sm text-red-600">{errorMsg}</Text>
          )}
          {status === "ok" && results.length === 0 && (
            <View className="items-center py-8">
              <Text className="text-base text-gray-500">No products found</Text>
              <Text className="text-sm text-gray-400 mt-1">
                Try a different search term or retailer
              </Text>
            </View>
          )}
          {results.length > 0 && (
            <View className="gap-3">
              <Text className="text-sm text-gray-500">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </Text>
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFeedback={onFeedback}
                />
              ))}
            </View>
          )}

          {/* Ask AI section */}
          <View className="gap-2 border-t border-gray-200 pt-4 mt-2">
            <Text className="text-lg font-semibold text-gray-900">Ask AI</Text>
            <Text className="text-sm text-gray-500">
              Ask a question about products and get AI-powered answers
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                value={aiQuestion}
                placeholder="e.g. What's the cheapest oat milk?"
                placeholderTextColor="#6b7280"
                onChangeText={setAiQuestion}
                onSubmitEditing={onAskAI}
                returnKeyType="send"
                autoCapitalize="none"
              />
              <Pressable
                onPress={onAskAI}
                disabled={aiStatus === "loading" || !aiQuestion.trim()}
                className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${aiStatus === "loading" || !aiQuestion.trim() ? "opacity-60" : ""} active:opacity-90`}
              >
                {aiStatus === "loading" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Ask</Text>
                )}
              </Pressable>
            </View>
            {aiStatus === "error" && aiError && (
              <Text className="text-sm text-red-600">{aiError}</Text>
            )}
            {aiStatus === "ok" && aiAnswer && (
              <View className="rounded-xl border border-gray-200 bg-gray-50 p-4 gap-2">
                <Text className="text-base text-gray-900">{aiAnswer}</Text>
                {aiProducts.length > 0 && (
                  <View className="gap-2 mt-2">
                    {aiProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onFeedback={onFeedback}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Price comparison section */}
          <View className="gap-2 border-t border-gray-200 pt-4 mt-2">
            <Text className="text-lg font-semibold text-gray-900">
              Price Comparison
            </Text>
            <Text className="text-sm text-gray-500">
              Compare prices for a product across retailers
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                value={compareQuery}
                placeholder="e.g. Vollmilch 1L"
                placeholderTextColor="#6b7280"
                onChangeText={setCompareQuery}
                onSubmitEditing={onCompare}
                returnKeyType="search"
                autoCapitalize="none"
              />
              <Pressable
                onPress={onCompare}
                disabled={compareStatus === "loading" || !compareQuery.trim()}
                className={`rounded-xl bg-[#0a7ea4] px-4 py-3 justify-center ${compareStatus === "loading" || !compareQuery.trim() ? "opacity-60" : ""} active:opacity-90`}
              >
                {compareStatus === "loading" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Compare</Text>
                )}
              </Pressable>
            </View>
            {compareStatus === "ok" && compareResults.length === 0 && (
              <Text className="text-sm text-gray-500 text-center py-4">
                No results found
              </Text>
            )}
            {compareResults.length > 0 && (
              <View className="gap-2">
                {compareResults.map((item, idx) => (
                  <View
                    key={item.id}
                    className={`flex-row items-center justify-between rounded-xl border p-3 ${idx === 0 ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}
                  >
                    <View className="flex-1 gap-0.5">
                      <Text
                        className="text-sm font-medium text-gray-900"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {item.retailer}
                      </Text>
                    </View>
                    <View className="items-end">
                      {item.price != null && (
                        <Text className="text-base font-bold text-gray-900">
                          CHF {item.price.toFixed(2)}
                        </Text>
                      )}
                      {item.discount_pct != null && item.discount_pct > 0 && (
                        <Text className="text-xs font-bold text-red-600">
                          -{item.discount_pct}%
                        </Text>
                      )}
                    </View>
                    {idx === 0 && (
                      <View className="ml-2 rounded-full bg-green-200 px-2 py-0.5">
                        <Text className="text-xs font-bold text-green-800">
                          Best
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
