import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider } from "@clerk/clerk-expo";
import { useEffect } from "react";

import { clerkConfig, tokenCache } from "./src/lib/clerk";
import { initPostHog, trackEvent } from "./src/lib/posthog";

/**
 * Welcome Screen Component
 * Simple welcome screen for the Korb app
 */
function WelcomeScreen() {
  useEffect(() => {
    // Track screen view
    trackEvent("screen_view", { screen: "welcome" });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Korb</Text>
      <Text style={styles.subtitle}>
        Meal planning and shared shopping for households
      </Text>
      <View style={styles.featureList}>
        <Text style={styles.feature}>Discover recipes</Text>
        <Text style={styles.feature}>Plan meals</Text>
        <Text style={styles.feature}>Shop together</Text>
        <Text style={styles.feature}>Cook with joy</Text>
      </View>
      <Text style={styles.hint}>
        Authentication and analytics are ready to go!
      </Text>
    </View>
  );
}

/**
 * Root App Component
 * Wraps the app with Clerk and PostHog providers
 */
export default function App() {
  // Initialize PostHog on app startup
  useEffect(() => {
    initPostHog().then(() => {
      trackEvent("app_opened");
    });
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkConfig.publishableKey}
      tokenCache={tokenCache}
    >
      <SafeAreaProvider>
        <WelcomeScreen />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  featureList: {
    alignItems: "center",
    marginBottom: 32,
  },
  feature: {
    fontSize: 18,
    color: "#333",
    marginVertical: 6,
    fontWeight: "500",
  },
  hint: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
});
