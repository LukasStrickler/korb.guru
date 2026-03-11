import { View, Text, StyleSheet } from "react-native";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected === null || isConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>You are offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fef08a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#854d0e",
    fontWeight: "500",
  },
});
