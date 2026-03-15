import { ApiError, discoverRecipes, swipeRecipe, type Recipe } from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RecipesScreen() {
  const { getToken } = useAuth();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [swiping, setSwiping] = useState(false);

  const loadRecipes = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const token = await getToken();
      if (!token) {
        setStatus("error");
        setErrorMsg("Not signed in");
        return;
      }
      const data = await discoverRecipes(token);
      setRecipes(data);
      setCurrentIndex(0);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(
        e instanceof ApiError && e.detail
          ? e.detail
          : e instanceof Error
            ? e.message
            : "Failed to load recipes",
      );
    }
  }, [getToken]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const currentRecipe: Recipe | undefined = recipes[currentIndex];

  const onSwipe = useCallback(
    async (action: "accept" | "reject") => {
      if (!currentRecipe || swiping) return;
      setSwiping(true);
      try {
        const token = await getToken();
        if (token) {
          await swipeRecipe(token, currentRecipe.id, action);
        }
      } catch {
        // Swipe failed silently; move on
      } finally {
        setSwiping(false);
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [currentRecipe, swiping, getToken],
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6 pb-8">
        <View className="gap-1 mb-6">
          <Text className="text-3xl font-bold text-gray-900">Recipes</Text>
          <Text className="text-base text-gray-500">
            The more you swipe, the better your recommendations!
          </Text>
        </View>

        {status === "loading" && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0a7ea4" />
            <Text className="mt-4 text-base text-gray-500">
              Finding recipes for you...
            </Text>
          </View>
        )}

        {status === "error" && errorMsg && (
          <View className="flex-1 items-center justify-center gap-3">
            <Text className="text-sm text-red-600 text-center">{errorMsg}</Text>
            <Pressable
              onPress={loadRecipes}
              className="rounded-xl bg-[#0a7ea4] px-4 py-3 active:opacity-90"
            >
              <Text className="text-white font-semibold">Retry</Text>
            </Pressable>
          </View>
        )}

        {status === "ok" && !currentRecipe && (
          <View className="flex-1 items-center justify-center gap-3">
            <Text className="text-base text-gray-500">No more recipes</Text>
            <Text className="text-sm text-gray-400">
              Check back later for new suggestions
            </Text>
            <Pressable
              onPress={loadRecipes}
              className="rounded-xl bg-[#0a7ea4] px-4 py-3 mt-2 active:opacity-90"
            >
              <Text className="text-white font-semibold">Refresh</Text>
            </Pressable>
          </View>
        )}

        {status === "ok" && currentRecipe && (
          <View className="flex-1 justify-between">
            {/* Recipe card */}
            <View className="rounded-xl border border-gray-200 bg-gray-50 p-6 gap-4 flex-1 justify-center">
              <Text className="text-2xl font-bold text-gray-900 text-center">
                {currentRecipe.title}
              </Text>

              <View className="flex-row justify-center gap-6">
                {currentRecipe.time_minutes != null && (
                  <View className="items-center">
                    <Text className="text-sm text-gray-500">Time</Text>
                    <Text className="text-lg font-semibold text-gray-900">
                      {currentRecipe.time_minutes} min
                    </Text>
                  </View>
                )}
                {currentRecipe.cost != null && (
                  <View className="items-center">
                    <Text className="text-sm text-gray-500">Cost</Text>
                    <Text className="text-lg font-semibold text-gray-900">
                      CHF {currentRecipe.cost.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View className="items-center">
                  <Text className="text-sm text-gray-500">Ingredients</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    {currentRecipe.ingredients.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Swipe buttons */}
            <View className="flex-row justify-center gap-6 mt-6">
              <Pressable
                onPress={() => onSwipe("reject")}
                disabled={swiping}
                className={`w-16 h-16 rounded-full border-2 border-gray-300 bg-white items-center justify-center ${swiping ? "opacity-60" : ""} active:opacity-80`}
              >
                <Text className="text-2xl">👎</Text>
              </Pressable>
              <Pressable
                onPress={() => onSwipe("accept")}
                disabled={swiping}
                className={`w-16 h-16 rounded-full border-2 border-red-300 bg-red-50 items-center justify-center ${swiping ? "opacity-60" : ""} active:opacity-80`}
              >
                <Text className="text-2xl">❤️</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
