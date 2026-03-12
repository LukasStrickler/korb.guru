import type { ReactNode } from "react";

import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

const mockedUseAuth = jest.fn();
const mockProviderSpy = jest.fn(
  ({ children }: { children: ReactNode }) => children,
);
const mockClientSpy = jest.fn().mockImplementation(() => ({}));

jest.mock("@clerk/clerk-expo", () => ({
  __esModule: true,
  useAuth: () => mockedUseAuth(),
}));

jest.mock("convex/react", () => ({
  __esModule: true,
  ConvexReactClient: mockClientSpy,
}));

jest.mock("convex/react-clerk", () => ({
  __esModule: true,
  ConvexProviderWithClerk: mockProviderSpy,
}));

describe("ConvexClientProvider", () => {
  let ConvexClientProvider!: typeof import("@/lib/convex").ConvexClientProvider;

  beforeEach(() => {
    process.env["EXPO_PUBLIC_CONVEX_URL"] =
      "https://bright-fox-123.convex.cloud";
    mockProviderSpy.mockClear();
    mockClientSpy.mockClear();

    if (!ConvexClientProvider) {
      ({ ConvexClientProvider } = require("@/lib/convex"));
    }
  });

  it("passes Clerk useAuth directly into ConvexProviderWithClerk", async () => {
    const getToken = jest.fn();
    mockedUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken,
    });

    render(
      <ConvexClientProvider>
        <Text>child</Text>
      </ConvexClientProvider>,
    );

    const firstCall = mockProviderSpy.mock.calls[0]?.[0] as
      | { useAuth: () => unknown }
      | undefined;

    await waitFor(() => {
      expect(firstCall?.useAuth).toBeDefined();
      expect(firstCall?.useAuth()).toEqual(mockedUseAuth());
    });
  });
});
