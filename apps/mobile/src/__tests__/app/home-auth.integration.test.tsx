import { render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

const convexAuthState = {
  branch: "loading" as "loading" | "unauthenticated" | "authenticated",
};

const mockedUseAuth = jest.fn();
const mockedUseClerk = jest.fn(() => ({
  signOut: jest.fn(),
}));
const mockedUseMutation = jest.fn(() => jest.fn().mockResolvedValue(undefined));
const mockedUseQuery = jest.fn(() => null);

jest.mock("@clerk/clerk-expo", () => ({
  __esModule: true,
  useAuth: () => mockedUseAuth(),
  useClerk: () => mockedUseClerk(),
}));

jest.mock("convex/server", () => ({
  __esModule: true,
  makeFunctionReference: (name: string) => name,
}));

jest.mock("convex/react", () => ({
  __esModule: true,
  Authenticated: ({ children }: { children: ReactNode }) =>
    convexAuthState.branch === "authenticated" ? children : null,
  AuthLoading: ({ children }: { children: ReactNode }) =>
    convexAuthState.branch === "loading" ? children : null,
  Unauthenticated: ({ children }: { children: ReactNode }) =>
    convexAuthState.branch === "unauthenticated" ? children : null,
  useMutation: () => mockedUseMutation(),
  useQuery: () => mockedUseQuery(),
}));

jest.mock("@/components/sign-out-button", () => ({
  __esModule: true,
  SignOutButton: () => null,
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  ApiError: class ApiError extends Error {
    detail: string | undefined;
    status: number;

    constructor(message: string, status: number, detail?: string) {
      super(message);
      this.status = status;
      this.detail = detail;
    }
  },
  deleteAccount: jest.fn(),
  fetchExamples: jest.fn(),
  fetchMe: jest.fn(),
  getApiBaseUrl: jest.fn(() => "http://api.test"),
}));

jest.mock("@/lib/posthog", () => ({
  __esModule: true,
  identifyUser: jest.fn(),
}));

import HomeScreenOuter, { HomeAuthGate } from "@/app/(home)/index";

describe("Home screen Convex auth states", () => {
  beforeEach(() => {
    convexAuthState.branch = "loading";
    mockedUseAuth.mockReturnValue({
      getToken: jest.fn().mockResolvedValue(null),
      isLoaded: true,
      isSignedIn: true,
      userId: "user_123",
    });
  });

  it("shows a signed-in loading message while Convex auth is loading", () => {
    render(<HomeAuthGate />);

    expect(screen.getByText("Connecting to Convex…")).toBeTruthy();
  });

  it("shows an auth help message when Convex rejects the session", async () => {
    convexAuthState.branch = "unauthenticated";
    render(<HomeAuthGate />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load your account/i)).toBeTruthy();
      expect(screen.getByText(/sign out and try again/i)).toBeTruthy();
    });
  });

  it("renders the main content when Convex auth is established", () => {
    convexAuthState.branch = "authenticated";
    render(<HomeScreenOuter />);

    expect(screen.getByText("Welcome")).toBeTruthy();
  });
});
