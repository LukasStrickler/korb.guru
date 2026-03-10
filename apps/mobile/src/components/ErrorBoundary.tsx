import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | undefined;
}

const ErrorFallback: React.FC<{
  error: Error | undefined;
  resetError: () => void;
}> = ({ resetError }) => {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>
          We encountered an unexpected error. Please try again.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={resetError}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

class ErrorBoundaryClass extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} resetError={this.resetError} />
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = ErrorBoundaryClass;

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    padding: 24,
  },
  errorContent: {
    alignItems: "center",
    maxWidth: 320,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
});
