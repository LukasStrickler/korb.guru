# Storybook (mobile)

One artifact (`*.stories.tsx`) for visual development and Jest tests via `composeStories`.

## Quick reference

| Command                                            | What                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| **`pnpm storybook:web`**                           | Browser (Vite, :6006). Default viewport mobile (414×896). Use for component work. |
| **`pnpm storybook`**                               | Metro; then **i** / **a** / **w** (iOS / Android / Expo web).                     |
| **`pnpm storybook:ios`** / **`storybook:android`** | Metro + open simulator/emulator.                                                  |
| **`pnpm storybook:tunnel`** / **`storybook:lan`**  | Metro + exp:// URL for Expo Go.                                                   |

Config: **web** `.storybook/` (Vite), **native** `.rnstorybook/` (on-device). Route: `app/storybook.tsx` when `EXPO_PUBLIC_ENVIRONMENT=storybook`.

## Viewport (web only)

Default is `mobile2` (414×896) in `.storybook/preview.ts` via `initialGlobals.viewport`. Use the toolbar to switch. Override per story: `parameters: { viewport: { defaultViewport: "mobile1" } }`.

## Portable stories (Jest)

Import the same stories and render with `@testing-library/react-native`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { composeStories } from "@storybook/react";
import * as stories from "./OfflineBanner.stories";

const { Offline } = composeStories(stories);
test("shows offline message", () => {
  render(<Offline />);
  expect(screen.getByText("You are offline")).toBeTruthy();
});
```

If stories use `.rnstorybook/preview` decorators, add a setup file with `setProjectAnnotations(previewAnnotations)`.

## Notes

- **Web** supports `play` and `@storybook/test`; **native** does not — use Jest + `composeStories` for interaction tests.
- Don’t model router pathname as a story; test with `renderRouter` (expo-router/testing-library).
- Cache issues (Expo web): `EXPO_PUBLIC_ENVIRONMENT=storybook expo start --web --clear` from `apps/mobile`.
- Headless: run `storybook:web` on server, `ssh -L 6006:localhost:6006 user@server`, open http://localhost:6006.

## References

- [Storybook React Native Web (Vite)](https://storybook.js.org/docs/get-started/frameworks/react-native-web-vite)
- [React Native Storybook](https://storybookjs.github.io/react-native/docs/intro/getting-started/)
- [Expo: Storybook and Expo](https://expo.dev/blog/storybook-and-expo)
