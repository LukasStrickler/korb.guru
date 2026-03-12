import type { PropsWithChildren } from "react";

import { useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const BAD_CONVEX_URLS = ["", "your-convex-url", "https://example.convex.cloud"];

function getConvexUrl(): string {
  const url = process.env["EXPO_PUBLIC_CONVEX_URL"] ?? "";
  if (!url || BAD_CONVEX_URLS.includes(url)) {
    throw new Error(
      "EXPO_PUBLIC_CONVEX_URL is missing or placeholder. Run `pnpm --filter @korb/convex dev` and set EXPO_PUBLIC_CONVEX_URL in .env to the deployment URL.",
    );
  }
  return url;
}

const convexUrl = getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: PropsWithChildren) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
