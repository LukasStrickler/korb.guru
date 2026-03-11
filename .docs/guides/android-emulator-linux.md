# Android emulator on Linux

Install and run the Android emulator on Linux for Expo/Storybook: on a **laptop** (with display) or **headless server** (optional VNC).

See [Storybook (mobile)](storybook-mobile.md) for using the emulator with Storybook (real mobile layout, Metro on server + Expo Go in emulator).

## What to install

| Component          | Purpose                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **JDK 17**         | Android toolchain (OpenJDK or Azul Zulu).                                                                                           |
| **Android SDK**    | [Android Studio](https://developer.android.com/studio) or [command-line tools](https://developer.android.com/studio#command-tools). |
| **SDK Platform**   | API 34 or 35.                                                                                                                       |
| **System image**   | e.g. `system-images;android-34;google_apis;x86_64`.                                                                                 |
| **platform-tools** | Includes `adb`.                                                                                                                     |
| **emulator**       | From `sdkmanager`.                                                                                                                  |
| **AVD**            | One virtual device (e.g. Pixel 6, API 34).                                                                                          |

**Env:** `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) = SDK path. `PATH` includes `$ANDROID_HOME/cmdline-tools/latest/bin`, `$ANDROID_HOME/platform-tools`, `$ANDROID_HOME/emulator`.

**Headless:** x86_64 emulator needs **KVM**. If no `/dev/kvm`, enable it or use [Storybook web + SSH](storybook-mobile.md#notes) / [storybook:tunnel](storybook-mobile.md#quick-reference) and run the emulator on your laptop. **VPS (e.g. netcup):** Nested virtualization often unavailable; use a provider with nested virt or run the emulator on your machine.

## Laptop (with display)

1. Install Android Studio (or JDK 17 + command-line tools).
2. Device Manager → install system image (API 34, Google APIs, x86_64) → create AVD.
3. Set `ANDROID_HOME`, add `platform-tools` and `emulator` to `PATH`.
4. Start: Device Manager or `emulator -avd YourAVDName`.

Then use [Storybook with emulator](storybook-mobile.md#quick-reference) (Metro on dev server, Expo Go in emulator).

## Headless server (command-line only)

### 1. Dependencies (Debian/Ubuntu)

```bash
sudo apt-get update && sudo apt-get install -y unzip openjdk-17-jdk libc6-dev
```

### 2. Command-line tools

Download Linux command-line tools from [developer.android.com/studio](https://developer.android.com/studio#command-tools). Extract so `sdkmanager` is at `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager`.

### 3. Env and packages

```bash
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-34" "system-images;android-34;google_apis;x86_64"
```

### 4. AVD and run

```bash
echo no | avdmanager create avd -n Pixel_34 -k "system-images;android-34;google_apis;x86_64" -d "pixel_6"
emulator -avd Pixel_34 -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim
```

Wait for boot: `adb shell getprop sys.boot_completed` → `1`.

**VNC (view from laptop):** Install `xvfb x11vnc`, start `Xvfb :99`, set `DISPLAY=:99`, run emulator without `-no-window`, then `x11vnc -display :99 -localhost -nopw` and tunnel 5900 from your laptop.

## References

- [Expo: Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Android command-line tools](https://developer.android.com/studio/command-line#install-cmdline-tools)
