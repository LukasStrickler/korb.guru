const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");

// SDK 52+ configures Metro for monorepos automatically (see docs.expo.dev/guides/monorepos).
// We only add NativeWind; do not set watchFolders, resolver.nodeModulesPaths, or resolver.disableHierarchicalLookup.
const config = getDefaultConfig(__dirname);
const withNativeWindConfig = withNativeWind(config, { input: "./global.css" });

module.exports = withStorybook(withNativeWindConfig);
