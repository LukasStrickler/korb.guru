/**
 * Types for Clerk custom email/password + MFA flow.
 * @clerk/clerk-expo re-exports from @clerk/clerk-react; runtime API may include
 * these fields for the custom flow even if main types omit them.
 */
export type SignInNavigate = (opts: {
  session: { currentTask?: unknown } | null;
  decorateUrl: (path: string) => string;
}) => void;

export interface SignInCustomFlow {
  status: string | null;
  password: (opts: {
    emailAddress: string;
    password: string;
  }) => Promise<{ error: unknown }>;
  finalize: (opts: { navigate: SignInNavigate }) => Promise<void>;
  mfa?: {
    sendEmailCode: () => Promise<unknown>;
    verifyEmailCode: (opts: { code: string }) => Promise<unknown>;
  };
  supportedSecondFactors?: Array<{ strategy: string }>;
}

export interface SignUpCustomFlow {
  status: string | null;
  password: (opts: {
    emailAddress: string;
    password: string;
  }) => Promise<{ error: unknown }>;
  verifications: {
    sendEmailCode: () => Promise<unknown>;
    verifyEmailCode: (opts: { code: string }) => Promise<unknown>;
  };
  finalize: (opts: { navigate: SignInNavigate }) => Promise<void>;
  unverifiedFields?: string[];
  missingFields?: string[];
}

export interface UseSignInCustomReturn {
  signIn: SignInCustomFlow | null;
  errors?: { fields?: Record<string, { message: string }> };
  fetchStatus: "idle" | "fetching";
}

export interface UseSignUpCustomReturn {
  signUp: SignUpCustomFlow | null;
  errors?: { fields?: Record<string, { message: string }> };
  fetchStatus: "idle" | "fetching";
}
