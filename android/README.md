# Bewegungserinnerung (Android)

Native Android counterpart to the root web app. See [CLAUDE.md](CLAUDE.md) for architecture, and `../openspec/changes/add-android-app/` for the full specification.

## SDK levels

- `minSdk = 33` (Android 13) — see design.md D9. Chosen over 31 to avoid handling two different exact-alarm permission variants (API 31 vs. 33) for no product benefit.
- `compileSdk` / `targetSdk = 37` (Android 17) — raised from the originally-planned 36 because the Compose BOM in use (2026.08.00) requires compiling against API 37 or later; API 37.2 is a stable (non-beta) platform release at implementation time.

## Build

```bash
./gradlew assembleDebug
```

Requires `ANDROID_HOME`/`ANDROID_SDK_ROOT` set and `android/local.properties` with `sdk.dir=<path-to-sdk>` (gitignored, machine-specific).
