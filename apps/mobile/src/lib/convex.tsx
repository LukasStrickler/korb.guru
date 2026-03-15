import { type PropsWithChildren, useMemo } from "react";

import { useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const BAD_CONVEX_URLS = ["", "your-convex-url", "https://example.convex.cloud"];

/** Expo inlines EXPO_PUBLIC_* at build time when using dot notation. */
function getConvexUrl(): string {
  const env = process.env as { EXPO_PUBLIC_CONVEX_URL?: string };
  const url = env.EXPO_PUBLIC_CONVEX_URL ?? "";
  if (!url || BAD_CONVEX_URLS.includes(url)) {
    throw new Error(
      "EXPO_PUBLIC_CONVEX_URL is missing or placeholder. Run `pnpm --filter @korb/convex dev` and set EXPO_PUBLIC_CONVEX_URL in .env to the deployment URL.",
    );
  }
  return url;
}

/** Placeholder so Storybook can load the module without throwing. */
const STORYBOOK_PLACEHOLDER = "https://storybook-placeholder.convex.cloud";

function getConvexUrlOrPlaceholder(): string {
  if (process.env["EXPO_PUBLIC_ENVIRONMENT"] === "storybook") {
    return STORYBOOK_PLACEHOLDER;
  }
  return getConvexUrl();
}

export function ConvexClientProvider({ children }: PropsWithChildren) {
  const convex = useMemo(() => {
    const convexUrl = getConvexUrlOrPlaceholder();
    return new ConvexReactClient(convexUrl);
  }, []);
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
