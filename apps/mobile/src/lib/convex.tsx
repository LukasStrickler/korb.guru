import type { PropsWithChildren } from "react";

import { useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const getConvexUrl = (): string => {
  const convexUrl = process.env["EXPO_PUBLIC_CONVEX_URL"];

  if (!convexUrl) {
    console.warn(
      "Warning: EXPO_PUBLIC_CONVEX_URL is not set. Convex queries will fail until it is configured.",
    );
    return "https://example.convex.cloud";
  }

  return convexUrl;
};

const convex = new ConvexReactClient(getConvexUrl());

/** Convex + Clerk: passes auth token to Convex. Must be inside ClerkProvider. */
export function ConvexClientProvider({ children }: PropsWithChildren) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
