import {
  addMealPlan,
  ApiError,
  bulkAddGroceryItems,
  deleteMealPlan,
  discoverRecipesWithType,
  generateGroceryListFromPlan,
  getGroceryLists,
  getMealPlans,
  swipeRecipe,
  type GroceryList,
  type MealPlan,
  type MealSlot,
  type Recipe,
} from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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
  const [recipeType, setRecipeType] = useState<string | undefined>(undefined);
  const [showListPicker, setShowListPicker] = useState(false);
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [addingToList, setAddingToList] = useState(false);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  // Meal planner
  const [showPlanner, setShowPlanner] = useState(false);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [plannerRecipes, setPlannerRecipes] = useState<Recipe[]>([]);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState("");
  const [pickerSlot, setPickerSlot] = useState<MealSlot>("dinner");

  const getWeekDates = (): string[] => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0] ?? "";
    });
  };

  const weekDates = getWeekDates();
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

  const openPlanner = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const start = weekDates[0]!;
      const end = weekDates[6]!;
      const [plans, recs] = await Promise.all([
        getMealPlans(token, start, end),
        discoverRecipesWithType(token),
      ]);
      setMealPlans(plans);
      setPlannerRecipes(recs);
      setShowPlanner(true);
    } catch {
      // ignore
    }
  }, [getToken, weekDates]);

  const onAddToPlan = async (recipeId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const plan = await addMealPlan(token, recipeId, pickerDate, pickerSlot);
      setMealPlans((prev) => [...prev, plan]);
      setShowRecipePicker(false);
    } catch {
      // ignore
    }
  };

  const onDeletePlan = async (planId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteMealPlan(token, planId);
      setMealPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch {
      // ignore
    }
  };

  const onGenerateList = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await generateGroceryListFromPlan(token, weekDates[0]!, weekDates[6]!);
      Alert.alert("Grocery list created from meal plan!");
    } catch {
      // ignore
    }
  };

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
      const data = await discoverRecipesWithType(token, recipeType);
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
  }, [getToken, recipeType]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const currentRecipe: Recipe | undefined = recipes[currentIndex];

  const onAddToList = useCallback(async () => {
    if (!currentRecipe) return;
    try {
      const token = await getToken();
      if (!token) return;
      const lists = await getGroceryLists(token);
      setGroceryLists(lists);
      setShowListPicker(true);
    } catch {
      // ignore
    }
  }, [currentRecipe, getToken]);

  const onSelectList = useCallback(
    async (listId: string) => {
      if (!currentRecipe || addingToList) return;
      setAddingToList(true);
      try {
        const token = await getToken();
        if (!token) return;
        const items = currentRecipe.ingredients.map((name) => ({
          ingredient_name: name,
        }));
        await bulkAddGroceryItems(token, listId, items);
        setShowListPicker(false);
        setAddedMsg(`${currentRecipe.ingredients.length} ingredients added!`);
        setTimeout(() => setAddedMsg(null), 2500);
      } catch {
        // ignore
      } finally {
        setAddingToList(false);
      }
    },
    [currentRecipe, addingToList, getToken],
  );

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
        <View className="gap-2 mb-4">
          <Text className="text-3xl font-bold text-gray-900">Recipes</Text>
          <Text className="text-base text-gray-500">
            The more you swipe, the better your recommendations!
          </Text>
          <View className="flex-row gap-2 items-center">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-1"
            >
              <View className="flex-row gap-2">
                {(
                  [
                    { label: "All", value: undefined },
                    { label: "Protein", value: "protein" },
                    { label: "Veggie", value: "veggie" },
                    { label: "Carb", value: "carb" },
                  ] as const
                ).map((filter) => (
                  <Pressable
                    key={filter.label}
                    onPress={() => setRecipeType(filter.value)}
                    className={`rounded-full px-4 py-2 border ${
                      recipeType === filter.value
                        ? "bg-[#0a7ea4] border-[#0a7ea4]"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        recipeType === filter.value
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable
              onPress={openPlanner}
              className="rounded-xl bg-[#0a7ea4] px-3 py-2 active:opacity-90"
            >
              <Text className="text-white font-semibold text-xs">
                Plan Meals
              </Text>
            </Pressable>
          </View>
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

            {/* Add to list button */}
            <Pressable
              onPress={onAddToList}
              className="rounded-xl border border-[#0a7ea4] py-2.5 items-center mt-2 active:opacity-80"
            >
              <Text className="text-[#0a7ea4] font-semibold text-sm">
                Add Ingredients to Grocery List
              </Text>
            </Pressable>
            {addedMsg && (
              <Text className="text-sm text-green-600 text-center">
                {addedMsg}
              </Text>
            )}

            {/* Swipe buttons */}
            <View className="flex-row justify-center gap-6 mt-4">
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

        {/* Grocery list picker modal */}
        <Modal
          visible={showListPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowListPicker(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-2xl p-6 gap-3">
              <Text className="text-lg font-bold text-gray-900">
                Choose a Grocery List
              </Text>
              {groceryLists.length === 0 && (
                <Text className="text-sm text-gray-500 py-4 text-center">
                  No grocery lists found
                </Text>
              )}
              {groceryLists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => onSelectList(list.id)}
                  disabled={addingToList}
                  className={`rounded-xl border border-gray-200 p-4 ${addingToList ? "opacity-60" : ""} active:bg-gray-50`}
                >
                  <Text className="text-base font-semibold text-gray-900">
                    {list.name}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {list.items.length} items
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setShowListPicker(false)}
                className="rounded-xl bg-gray-100 py-3 items-center mt-1 active:opacity-80"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Meal Planner Modal */}
        <Modal
          visible={showPlanner}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPlanner(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-2xl h-3/4">
              <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                <Text className="text-lg font-bold text-gray-900">
                  Meal Plan
                </Text>
                <Pressable onPress={() => setShowPlanner(false)}>
                  <Text className="text-[#0a7ea4] font-semibold">Close</Text>
                </Pressable>
              </View>
              <ScrollView horizontal className="flex-1">
                <View className="flex-row p-2">
                  {weekDates.map((date, di) => (
                    <View key={date} className="w-32 mx-1">
                      <Text className="text-sm font-bold text-gray-900 text-center mb-2">
                        {dayLabels[di] ?? ""} {date.slice(8)}
                      </Text>
                      {slots.map((slot) => {
                        const plan = mealPlans.find(
                          (p) =>
                            p.planned_date === date && p.meal_slot === slot,
                        );
                        const recipe = plan
                          ? plannerRecipes.find((r) => r.id === plan.recipe_id)
                          : null;
                        return (
                          <View
                            key={slot}
                            className="mb-1 rounded-lg border border-gray-200 p-2 min-h-[48px] justify-center"
                          >
                            <Text className="text-[10px] text-gray-400 uppercase">
                              {slot}
                            </Text>
                            {plan && recipe ? (
                              <Pressable
                                onLongPress={() => onDeletePlan(plan.id)}
                              >
                                <Text
                                  className="text-xs text-gray-900"
                                  numberOfLines={2}
                                >
                                  {recipe.title}
                                </Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                onPress={() => {
                                  setPickerDate(date);
                                  setPickerSlot(slot);
                                  setShowRecipePicker(true);
                                }}
                              >
                                <Text className="text-xs text-[#0a7ea4] text-center">
                                  +
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View className="p-4 border-t border-gray-200">
                <Pressable
                  onPress={onGenerateList}
                  className="rounded-xl bg-[#0a7ea4] py-3 items-center active:opacity-90"
                >
                  <Text className="text-white font-semibold">
                    Generate Grocery List
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Recipe picker for meal plan */}
        <Modal
          visible={showRecipePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRecipePicker(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/40 p-6">
            <View className="bg-white rounded-2xl w-full max-h-[60%] p-4">
              <Text className="text-lg font-bold text-gray-900 mb-3">
                Pick a Recipe
              </Text>
              <ScrollView>
                {plannerRecipes.map((recipe) => (
                  <Pressable
                    key={recipe.id}
                    onPress={() => onAddToPlan(recipe.id)}
                    className="rounded-xl border border-gray-200 p-3 mb-2 active:bg-gray-50"
                  >
                    <Text className="text-sm font-medium text-gray-900">
                      {recipe.title}
                    </Text>
                    {recipe.time_minutes != null && (
                      <Text className="text-xs text-gray-500">
                        {recipe.time_minutes} min
                      </Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => setShowRecipePicker(false)}
                className="rounded-xl bg-gray-100 py-3 items-center mt-2 active:opacity-80"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
