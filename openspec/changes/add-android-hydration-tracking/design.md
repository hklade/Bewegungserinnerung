## Context

The existing web app's "Trinkmanager" hydration widget persists to a server-side CSV file (`Trinkdaten.csv`). On Android there is no server; this design describes hydration tracking backed by local Room storage, consistent with the rest of the app's persistence approach.

## Goals / Non-Goals

**Goals:**
- Hydration logging and progress display work fully on-device with no server dependency.
- A failed persist never leaves the UI showing an amount that wasn't actually saved.

**Non-Goals:**
- No sync between the Android app and the existing web app, no shared backend, no cloud storage, no multi-device sync.
- No account system, no authentication — single implicit local user.
- No redesign of the visual/branding language beyond what's needed for Android (Material) conventions.

## Decisions

### D2: Room (SQLite) as system of record; CSV is import/export-only
**Decision:** Persist hydration entries in a local Room database. CSV is never read from or written to as the live store for hydration data (hydration is explicitly excluded from the CSV export/import capability — see `android-csv-import-export`).
**Why:** Room gives typed queries and transactional writes for free, which matters for optimistic-update-with-rollback logic (+250 ml/-250 ml with a persist failure path). CSV as a system-of-record on a phone has no equivalent of a user editing the file directly, so keeping it as the live store on Android buys nothing.
**Alternatives considered:** Keep CSV files as the live store on-device (rejected: no atomic multi-row updates, fragile concurrent-write handling).

### D3: Settings storage split — Room for domain settings row, DataStore only if needed for simple flags
**Decision:** The daily hydration goal is stored as part of the single settings/config row in Room (owned by `android-settings-configuration`), not in SharedPreferences/DataStore.
**Why:** The hydration goal must be observed reactively by the hydration screen (changing the goal in settings must immediately update the progress display); Room's `Flow`-based DAOs give that for free and keep a single persistence technology in the app.
**Alternatives considered:** Jetpack DataStore (rejected: would require a second persistence mechanism for one settings value; no benefit over a Room table here).

## Risks / Trade-offs

- [Hydration entries model "today's total" as the latest entry for the day rather than a sum of increments, which requires the DAO query to be correct about "latest" under concurrent optimistic updates] → Mitigation: `android-hydration-tracking`'s task list requires a unit test confirming the "today's total" query returns the latest entry for the day, not a sum.

## Open Questions

_None._
