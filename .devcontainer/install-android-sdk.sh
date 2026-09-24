#!/usr/bin/env bash
# Installiert das Android SDK (Command-line Tools, Platform, Build-Tools) für
# ./gradlew testDebugUnitTest / lint / assembleDebug im Devcontainer.
# Idempotent: bereits installierte Pakete werden übersprungen.
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
CMDLINE_TOOLS_ZIP="commandlinetools-linux-13114758_latest.zip"

# Muss zu compileSdk in android/app/build.gradle.kts passen.
SDK_PACKAGES=(
  "platform-tools"
  "platforms;android-37.0"
  "build-tools;37.0.0"
)

SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

if [ ! -x "$SDKMANAGER" ]; then
  echo "Android Command-line Tools werden nach $ANDROID_HOME installiert ..."
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/cmdline-tools.zip" "https://dl.google.com/android/repository/$CMDLINE_TOOLS_ZIP"
  unzip -q "$tmp/cmdline-tools.zip" -d "$tmp"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -rf "$tmp"
fi

# `yes` endet mit SIGPIPE (Exit 141), sobald sdkmanager fertig ist; unter
# pipefail würde das das Skript abbrechen, daher `|| true` auf `yes`.
(yes || true) | "$SDKMANAGER" --sdk_root="$ANDROID_HOME" --licenses > /dev/null
"$SDKMANAGER" --sdk_root="$ANDROID_HOME" "${SDK_PACKAGES[@]}"

echo "Android SDK bereit unter $ANDROID_HOME"
