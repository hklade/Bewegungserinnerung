## Context

The existing web app's settings live in a server-side JSON config file (`config.mjs`) edited via a browser form, including a free-text filesystem `exportPath` field. On Android there is no server and no arbitrary filesystem path a user can type; this design describes a single on-device settings row (Room) with an Android-native export-location picker in place of the free-text path field, and reactive observation so changes take effect immediately.

## Goals / Non-Goals

**Goals:**
- Settings changes (reminder window, weekdays-only, hydration goal, tone/vibration, export location) are observed reactively by both the UI and the alarm-rescheduling logic, so a saved change takes effect without an app restart.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions.

## Decisions

### D3: Settings storage split — Room for domain settings row, DataStore only if needed for simple flags
**Decision:** Store the single settings/config row (reminder window, weekdays-only, hydration goal, tone/vibration flags, export location) as one row in Room alongside the entry tables, not in SharedPreferences/DataStore.
**Why:** Settings changes must be observed reactively by both the UI and the alarm-rescheduling logic (changing the reminder window must reschedule alarms); Room's `Flow`-based DAOs give that for free and keep a single persistence technology in the app rather than two.
**Alternatives considered:** Jetpack DataStore (rejected: would require a second persistence mechanism and a second migration story for one settings row; no benefit over a Room table here).

### D10: Export writes to the public Downloads directory, plus a Share action
**Decision:** The export-location setting configured here (an Android-native storage/document picker, replacing the web app's free-text path field) becomes the default destination used by `android-csv-import-export`'s export flow; absent an explicit user choice, export defaults to the public `Downloads` directory.
**Why:** Downloads is where users expect to find exported files on Android, consistent with how the web app's export already behaves; the settings screen's picker lets the user override that default without typing a filesystem path (which has no reliable Android equivalent).
**Alternatives considered:** App-private directory only (rejected: not discoverable without a share action); requiring a picker choice on every export rather than a configurable default (rejected: adds a step to every export for no benefit over a settings-configured default).

## Risks / Trade-offs

- [A settings save that fails partway (e.g. a local storage error) could leave the UI showing unsaved values as if they were active] → Mitigation: settings changes require an explicit save action with a distinct success/error state, and a failed save leaves the previously saved settings in effect rather than a partially-applied state.

## Open Questions

_None._
