# Mobile: simulators and devices

**Audience:** Developers running the mobile app on simulators, emulators, or devices.  
**Doc type:** How-to.

The repo uses **Expo Go** by default. For custom native code or device installs, use **development builds** (EAS / `expo-dev-client`). Prefer **`pnpm dev:app`** from the repo root so API and Convex start before Metro; see [Local development](local-dev.md).

- [Root commands](#root-commands) · [Expo Go: pick a simulator/emulator](#expo-go-pick-a-simulator-or-emulator) · [Development builds (not Expo Go)](#development-builds-not-expo-go)

## Root commands

| Command                | What it runs                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`pnpm dev:app`**     | **Recommended:** API + Convex in the background, then **Expo in the foreground** — press **`i`** (iOS) or **`a`** (Android), or **Shift+I** / **Shift+A** to pick a simulator/emulator. One terminal. |
| **`pnpm dev:metro`**   | Metro only — use when API/Convex already run. Same as `pnpm --filter @korb/mobile run dev`.                                                                                                           |
| **`pnpm dev:backend`** | Backend only — DB + API + Convex, no Expo.                                                                                                                                                            |
| **`pnpm dev`**         | Full monorepo (includes website, scraper, contracts).                                                                                                                                                 |

**Default flow:** **`pnpm dev:app`** — no separate `dev:ios` / `dev:android` root scripts; Expo prompts let you open iOS or Android after Metro starts.

From **`apps/mobile`**, you can still run **`pnpm dev:ios`** / **`pnpm dev:android`** to call `expo start --ios` / `--android` directly if you only need Metro with auto-open (backend must be running separately).

## Expo Go: pick a simulator or emulator

With **Expo Go** (default), the app runs inside the Expo Go app. After **`pnpm dev:app`** (or **`pnpm dev:metro`**), use the Metro terminal:

- **`i`** — open in iOS Simulator (default or most recently focused simulator).
- **`a`** — open in Android emulator.
- **Shift+I** / **Shift+A** — list simulators/emulators and pick one.

### iOS Simulator

- Open **Simulator** first if you want a specific device: Xcode → Open Developer Tool → Simulator, or `open -a Simulator`, then **File → Open Simulator**. Press **`i`** in the Expo terminal; Expo targets the **most recently opened** simulator.

See [Expo: iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/).

### Android Emulator

- Start the emulator from **Android Studio → Device Manager** (or `emulator -avd <name>`), then press **`a`** in the Metro terminal, or **Shift+A** to choose.

### Physical device

Install **Expo Go** on the phone; ensure same LAN as your machine. With Metro running (`pnpm dev:app` or `pnpm dev:metro`), scan the QR code from the terminal.

## Development builds (not Expo Go)

1. Build once (EAS or locally) and install on simulator/emulator/device.
2. Start backend if needed (`pnpm dev:backend` or backend from `pnpm dev:app` flow), then Metro: **`pnpm dev:metro`** or from `apps/mobile`: **`pnpm dev`**.
3. The dev client connects to Metro when the bundler is up.

| Goal                                    | Command                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Backend + interactive Metro             | **`pnpm dev:app`**                                                                                                                    |
| Metro only                              | **`pnpm dev:metro`** or `cd apps/mobile && pnpm dev`                                                                                  |
| Auto-open iOS/Android from app dir only | `cd apps/mobile && pnpm dev:ios` / `pnpm dev:android` (Expo scripts; backend must run separately unless you use `pnpm dev:app` first) |
