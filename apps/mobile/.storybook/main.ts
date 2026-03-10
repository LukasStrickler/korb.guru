import type { StorybookConfig } from "@storybook/react-native-web-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {
      pluginReactOptions: {
        jsxImportSource: "nativewind",
      },
    },
  },

  stories: ["./intro.mdx", "../src/components/**/*.stories.?(ts|tsx|js|jsx)"],
  addons: ["@storybook/addon-docs"],
};

export default config;
