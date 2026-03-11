import type { Preview } from "@storybook/react-native";
import React from "react";
import { View } from "react-native";

const preview: Preview = {
  decorators: [
    (Story) => (
      <View style={{ padding: 16, flex: 1 }}>
        <Story />
      </View>
    ),
  ],
};

export default preview;
