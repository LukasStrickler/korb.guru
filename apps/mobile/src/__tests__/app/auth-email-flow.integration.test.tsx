import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

const mockReplace = jest.fn();

const mockedUseAuth = jest.fn();
const mockedUseClerk = jest.fn();
const mockedUseSignIn = jest.fn();
const mockedUseSignUp = jest.fn();
const mockedUseSignInWithApple = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  __esModule: true,
  useAuth: () => mockedUseAuth(),
  useClerk: () => mockedUseClerk(),
  useSignIn: () => mockedUseSignIn(),
  useSignUp: () => mockedUseSignUp(),
  useSignInWithApple: () => mockedUseSignInWithApple(),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

import AuthScreen from "@/app/(auth)/index";

describe("AuthScreen email sign-in-or-sign-up flow", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockedUseAuth.mockReturnValue({ isSignedIn: false });
    mockedUseClerk.mockReturnValue({ signOut: jest.fn() });
    mockedUseSignInWithApple.mockReturnValue({
      startAppleAuthenticationFlow: jest.fn(),
    });
  });

  it("falls back to sign-up when sign-in create reports identifier-not-found", async () => {
    const signInCreate = jest.fn().mockRejectedValue({
      errors: [{ code: "form_identifier_not_found" }],
    });
    const prepareFirstFactor = jest.fn();
    const signUpCreate = jest.fn().mockResolvedValue({});
    const prepareEmailAddressVerification = jest.fn().mockResolvedValue({});

    mockedUseSignIn.mockReturnValue({
      isLoaded: true,
      signIn: {
        status: "needs_first_factor",
        create: signInCreate,
        prepareFirstFactor,
        attemptFirstFactor: jest.fn(),
      },
      setActive: jest.fn(),
      errors: undefined,
      fetchStatus: "idle",
    });

    mockedUseSignUp.mockReturnValue({
      isLoaded: true,
      signUp: {
        status: "missing_requirements",
        create: signUpCreate,
        prepareEmailAddressVerification,
        attemptEmailAddressVerification: jest.fn(),
      },
      errors: undefined,
      fetchStatus: "idle",
    });

    render(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("you@example.com"),
      "new@example.com",
    );
    fireEvent.press(screen.getByText("Send sign-in code"));

    await waitFor(() => {
      expect(signInCreate).toHaveBeenCalledWith({
        identifier: "new@example.com",
      });
      expect(signUpCreate).toHaveBeenCalledWith({
        emailAddress: "new@example.com",
      });
      expect(prepareEmailAddressVerification).toHaveBeenCalledWith({
        strategy: "email_code",
      });
      expect(screen.getByText("Check your email")).toBeTruthy();
    });
    expect(prepareFirstFactor).not.toHaveBeenCalled();
  });

  it("uses create and prepareFirstFactor for sign-in email code", async () => {
    const signInCreate = jest.fn().mockResolvedValue({
      status: "needs_first_factor",
      supportedFirstFactors: [
        { strategy: "email_code", emailAddressId: "ea_123" },
      ],
    });
    const prepareFirstFactor = jest.fn().mockResolvedValue({
      status: "needs_first_factor",
    });

    mockedUseSignIn.mockReturnValue({
      isLoaded: true,
      signIn: {
        status: "needs_first_factor",
        create: signInCreate,
        supportedFirstFactors: [
          { strategy: "email_code", emailAddressId: "ea_123" },
        ],
        prepareFirstFactor,
        attemptFirstFactor: jest.fn(),
      },
      setActive: jest.fn(),
      errors: undefined,
      fetchStatus: "idle",
    });

    mockedUseSignUp.mockReturnValue({
      isLoaded: true,
      signUp: {
        status: "missing_requirements",
        create: jest.fn(),
        prepareEmailAddressVerification: jest.fn(),
        attemptEmailAddressVerification: jest.fn(),
      },
      errors: undefined,
      fetchStatus: "idle",
    });

    render(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("you@example.com"),
      "existing@example.com",
    );
    fireEvent.press(screen.getByText("Send sign-in code"));

    await waitFor(() => {
      expect(signInCreate).toHaveBeenCalledWith({
        identifier: "existing@example.com",
      });
      expect(prepareFirstFactor).toHaveBeenCalledWith({
        strategy: "email_code",
        emailAddressId: "ea_123",
      });
      expect(screen.getByText("Check your email")).toBeTruthy();
    });
  });

  it("verifies sign-up codes with attemptEmailAddressVerification when available", async () => {
    const setActive = jest.fn().mockResolvedValue(undefined);
    const attemptEmailAddressVerification = jest.fn().mockResolvedValue({});

    mockedUseSignIn.mockReturnValue({
      isLoaded: true,
      signIn: {
        status: "needs_first_factor",
        create: jest.fn().mockRejectedValue({
          errors: [{ code: "form_identifier_not_found" }],
        }),
        prepareFirstFactor: jest.fn(),
        attemptFirstFactor: jest.fn(),
      },
      setActive,
      errors: undefined,
      fetchStatus: "idle",
    });

    mockedUseSignUp.mockReturnValue({
      isLoaded: true,
      signUp: {
        status: "complete",
        createdSessionId: "sess_123",
        create: jest.fn().mockResolvedValue({}),
        prepareEmailAddressVerification: jest.fn().mockResolvedValue({}),
        attemptEmailAddressVerification,
      },
      errors: undefined,
      fetchStatus: "idle",
    });

    render(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("you@example.com"),
      "new@example.com",
    );
    fireEvent.press(screen.getByText("Send sign-in code"));

    await screen.findByText("Check your email");

    fireEvent.changeText(screen.getByPlaceholderText("Enter code"), "123456");
    fireEvent.press(screen.getByText("Verify"));

    await waitFor(() => {
      expect(attemptEmailAddressVerification).toHaveBeenCalledWith({
        code: "123456",
      });
      expect(setActive).toHaveBeenCalledWith({
        session: "sess_123",
      });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("completes sign-in with setActive when Clerk reports completion", async () => {
    const setActive = jest.fn().mockResolvedValue(undefined);
    const signInCreate = jest.fn().mockResolvedValue({
      status: "needs_first_factor",
      supportedFirstFactors: [
        { strategy: "email_code", emailAddressId: "ea_123" },
      ],
    });
    const prepareFirstFactor = jest.fn().mockResolvedValue({
      status: "needs_first_factor",
    });
    const attemptFirstFactor = jest.fn().mockResolvedValue({
      status: "complete",
      createdSessionId: "sess_signin",
    });

    mockedUseSignIn.mockReturnValue({
      isLoaded: true,
      signIn: {
        status: "needs_first_factor",
        create: signInCreate,
        supportedFirstFactors: [
          { strategy: "email_code", emailAddressId: "ea_123" },
        ],
        prepareFirstFactor,
        attemptFirstFactor,
      },
      setActive,
      errors: undefined,
      fetchStatus: "idle",
    });

    mockedUseSignUp.mockReturnValue({
      isLoaded: true,
      signUp: {
        status: "missing_requirements",
        create: jest.fn(),
      },
      errors: undefined,
      fetchStatus: "idle",
    });

    render(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("you@example.com"),
      "existing@example.com",
    );
    fireEvent.press(screen.getByText("Send sign-in code"));
    await screen.findByText("Check your email");
    fireEvent.changeText(screen.getByPlaceholderText("Enter code"), "123456");
    fireEvent.press(screen.getByText("Verify"));

    await waitFor(() => {
      expect(signInCreate).toHaveBeenCalledWith({
        identifier: "existing@example.com",
      });
      expect(prepareFirstFactor).toHaveBeenCalledWith({
        strategy: "email_code",
        emailAddressId: "ea_123",
      });
      expect(attemptFirstFactor).toHaveBeenCalledWith({
        strategy: "email_code",
        code: "123456",
      });
      expect(setActive).toHaveBeenCalledWith({ session: "sess_signin" });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("shows a readable sign-in error when Clerk returns a message-only error", async () => {
    const signInCreate = jest.fn().mockRejectedValue({
      message: "Too many attempts. Try again later.",
    });

    mockedUseSignIn.mockReturnValue({
      isLoaded: true,
      signIn: {
        status: "needs_first_factor",
        create: signInCreate,
        prepareFirstFactor: jest.fn(),
        attemptFirstFactor: jest.fn(),
      },
      setActive: jest.fn(),
      errors: undefined,
      fetchStatus: "idle",
    });

    mockedUseSignUp.mockReturnValue({
      isLoaded: true,
      signUp: {
        status: "missing_requirements",
        create: jest.fn(),
        prepareEmailAddressVerification: jest.fn(),
        attemptEmailAddressVerification: jest.fn(),
      },
      errors: undefined,
      fetchStatus: "idle",
    });

    render(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("you@example.com"),
      "existing@example.com",
    );
    fireEvent.press(screen.getByText("Send sign-in code"));

    await waitFor(() => {
      expect(
        screen.getByText("Too many attempts. Try again later."),
      ).toBeTruthy();
    });
  });
});
