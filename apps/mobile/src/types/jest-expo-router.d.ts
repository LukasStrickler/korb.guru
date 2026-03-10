/**
 * Expo Router testing-library matchers (toHavePathname, etc.) are registered at
 * runtime by jest-expo/expo-router; their types live in node_modules and are
 * excluded from our tsconfig. This augmentation makes expect(screen).toHavePathname
 * type-check.
 */
declare global {
  namespace jest {
    interface Matchers<R, T = unknown> {
      toHavePathname(pathname: string): R;
      toHavePathnameWithParams(pathname: string): R;
      toHaveSegments(segments: string[]): R;
      toHaveSearchParams(params: Record<string, string | string[]>): R;
      toHaveRouterState(state: Record<string, unknown> | undefined): R;
    }
  }
}

export {};
