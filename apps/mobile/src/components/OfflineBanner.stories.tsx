import type { Meta, StoryObj } from "@storybook/react-native";
import { View, Text } from "react-native";

/**
 * OfflineBanner shows "You are offline" when the device has no network.
 * In Storybook we render the visible state; the real component uses useNetworkStatus().
 */
const OfflineBannerPlaceholder = () => (
  <View
    style={{ backgroundColor: "#fef08a", padding: 16, alignItems: "center" }}
  >
    <Text style={{ color: "#854d0e", fontWeight: "500" }}>You are offline</Text>
  </View>
);

const meta = {
  component: OfflineBannerPlaceholder,
  title: "Components/OfflineBanner",
} satisfies Meta<typeof OfflineBannerPlaceholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Offline: Story = {};

export const WithExtraPadding: Story = {
  decorators: [
    (Story) => (
      <View style={{ padding: 24 }}>
        <Story />
      </View>
    ),
  ],
};

/** Example for smaller viewport; use the viewport toolbar in Storybook for Web (Vite). */
export const OnSmallViewport: Story = {};
