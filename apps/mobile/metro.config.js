const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");

// Load root .env when running from apps/mobile (e.g. pnpm dev from app dir) or from root (pnpm dev:app).
// When run via pnpm dev from repo root, dotenv-cli already injects env; this is a fallback.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
try {
  require("@expo/env").load(workspaceRoot, { force: false });
} catch {
  // @expo/env may not be available in all contexts; ignore
}

// SDK 52+ configures Metro for monorepos automatically (see docs.expo.dev/guides/monorepos).
// We only add NativeWind; do not set watchFolders, resolver.nodeModulesPaths, or resolver.disableHierarchicalLookup.
const config = getDefaultConfig(projectRoot);
const withNativeWindConfig = withNativeWind(config, { input: "./global.css" });

module.exports = withStorybook(withNativeWindConfig);
