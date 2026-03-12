# Mobile: simulators and devices

How to run the app on different iOS simulators, Android emulators, and physical devices. The repo uses **Expo Go** by default; for custom native code or installing on specific devices you can use **development builds** (EAS / `expo-dev-client`).

- [Root commands (auto-launch)](#root-commands-auto-launch) · [Expo Go: pick a simulator/emulator](#expo-go-pick-a-simulator-or-emulator) · [Development builds (not Expo Go)](#development-builds-not-expo-go)

## Root commands (auto-launch)

From the repo root:

| Command                        | Effect                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev:backend`             | Starts **everything except the app** (API, Convex, website, scraper, contracts). Run this first, then start the app in another terminal. |
| `pnpm dev:app`                 | Starts Metro only; press **`i`** (iOS) or **`a`** (Android), or **Shift+I** / **Shift+A** to pick a simulator.                           |
| `pnpm dev:ios`                 | Starts Metro and **auto-launches the default iOS Simulator** (Expo Go).                                                                  |
| `pnpm dev:android`             | Starts Metro and **auto-launches the default Android Emulator** (Expo Go).                                                               |
| From `apps/mobile`: `pnpm dev` | Same as `pnpm dev:app` (Metro only; use keyboard to pick device).                                                                        |

## Expo Go: pick a simulator or emulator

With **Expo Go** (default), the app runs inside the Expo Go app. You can still target different simulators/emulators.

### iOS Simulator

- **Default:** `pnpm dev:ios` opens the default simulator and launches Expo Go there.
- **Pick a different simulator:** Run `pnpm dev:app` from root (or from `apps/mobile`: `pnpm dev`). When Metro is running, press **Shift+I** in the same terminal. The Expo CLI shows a list of installed simulators; choose one and it will boot (if needed) and open Expo Go on it.
- **Manual option:** Open **Simulator** (Xcode → Open Developer Tool → Simulator, or `open -a Simulator`). Use **File → Open Simulator** to pick device and OS. Then press **`i`** in the Expo terminal (or run `pnpm dev:ios`); Expo targets the **most recently opened** simulator.

See [Expo: iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/).

### Android Emulator

- **Default:** `pnpm dev:android` opens the default Android emulator and launches Expo Go there.
- **Pick a different emulator:** Start the emulator you want from **Android Studio → Device Manager** (or `emulator -avd <name>`). Run `pnpm dev:app` (or from `apps/mobile`: `pnpm dev`), then press **`a`** (or **Shift+A** if the CLI offers a list). Expo will target the running emulator.
- Create and manage AVDs in Android Studio: **More Actions → Virtual Device Manager**. See [Expo: Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator/).

### Physical devices

With Expo Go you can also run on a **physical phone**: install **Expo Go** from the App Store / Play Store, ensure the device is on the same LAN as your machine. From `apps/mobile` run `pnpm dev` and scan the QR code (or press the appropriate key to open on a connected device if the CLI supports it).

## Development builds (not Expo Go)

**Expo Go** only supports a fixed set of native modules. If you need custom native code, different native config, or to install a single build on many devices/simulators, use a **development build** (your own build of the app that includes the Expo dev client).

1. **Add the dev client:** In `apps/mobile`, run `npx expo install expo-dev-client`.
2. **Configure EAS:** In `apps/mobile/eas.json`, add a profile that builds for the target (e.g. iOS Simulator). For simulator-only iOS builds, set `ios.simulator: true` in that profile (see [EAS: iOS Simulator builds](https://docs.expo.dev/build-reference/simulators/) and [Create a development build](https://docs.expo.dev/develop/development-builds/create-a-build/)).
3. **Build:** e.g. `eas build -p ios --profile development` (or `--profile <simulator-profile>`). For iOS device builds you need an Apple Developer account and proper signing.
4. **Install and run:** After the build, install the app on the simulator/emulator/device (EAS can prompt to install; or use `eas build:run -p ios --latest`). Then start the JS bundler with `npx expo start` (or `pnpm dev` in `apps/mobile`); the dev client will connect to Metro.

With a development build installed, you can open **any** simulator or emulator that has that build, then start Metro and the app will connect. You are no longer limited to “Expo Go on one default device.”

| Goal                                             | Approach                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| Quick local dev, default simulator               | `pnpm dev:ios` or `pnpm dev:android`                                 |
| Pick another simulator/emulator with Expo Go     | `pnpm dev:app`, then **Shift+I** (iOS) or **Shift+A** (Android)      |
| Custom native code / any device with one install | Development build: `expo-dev-client` + EAS build + install on target |

## See also

- [Local development](local-dev.md) — env vars, ports, single-service commands
- [Expo: iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo: Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Expo: Create a development build](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [EAS: Build for iOS Simulators](https://docs.expo.dev/build-reference/simulators/)
