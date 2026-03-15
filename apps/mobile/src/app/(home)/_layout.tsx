import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";

export default function HomeLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0a7ea4",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: { paddingBottom: 4, height: 56 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Search", tabBarLabel: "Search" }}
      />
      <Tabs.Screen
        name="deals"
        options={{ title: "Deals", tabBarLabel: "Deals" }}
      />
      <Tabs.Screen
        name="recipes"
        options={{ title: "Recipes", tabBarLabel: "Recipes" }}
      />
      <Tabs.Screen
        name="lists"
        options={{ title: "Lists", tabBarLabel: "Lists" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
    </Tabs>
  );
}
