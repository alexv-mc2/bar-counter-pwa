# Rolling Badger Bar Counter — MVP Spec

## Product purpose

Tablet web app for bartenders to count drinks sold during bar events. Runs locally on the device with no cloud dependency.

## MVP scope

- Installable PWA (manifest + service worker shell cache)
- Create/continue/close events with local history
- 16 configurable drink buttons (name, template, category, icon, color, count badge)
- Tap +1; Undo mode then tap −1 (floor at 0; exits after one tap attempt)
- Long press 5s opens edit modal
- RU default UI; DE language switch (localStorage)
- On-screen results view (**Итоги** / **Ergebnis**) before export
- Human-readable CSV export (UTF-8 BOM) with summary, drink totals, tap log
- IndexedDB persistence across refresh
- Reuse latest button layout for new events

## Non-goals

- Prices, revenue, payments, stock, customers, users/roles
- Supabase, Notion, OpenRouter, LLMs, analytics dashboards, charts
- XLSX export, cloud sync, backend APIs, auth

## Storage architecture

| Layer | Use |
|-------|-----|
| IndexedDB `events` | Bar events and button counts |
| IndexedDB `tapLogs` | Tap log entries (indexed by `eventId`) |
| IndexedDB `buttonTemplate` | Latest 16-button layout snapshot |
| localStorage | `rbbc.locale`, `rbbc.lastActiveEventId` |

No backend or cloud persistence.

## Data model (internal)

- **BarEvent**: id, name, createdAt, updatedAt, isActive, buttons[]
- **DrinkButton**: id, slotIndex, name, templateId?, category, icon, color, count
- **TapLogEntry**: id, timestamp, eventId, buttonId, buttonName, category, icon, color, delta (+1/−1)

CSV and results views expose only human-readable fields (no internal IDs, category, icon, color).

## Results view

- Open from active event or history (**Итоги** / **Ergebnis**)
- Shows event name, date/time, status, total drinks, per-drink counts (count > 0 only, sorted by count desc then name)
- Empty state when no drinks counted
- Actions: Export CSV, Back

## CSV report

- UTF-8 BOM for Excel/Numbers (Cyrillic)
- Section A: event name, date, total; drink name + quantity (count > 0 only)
- Section B: tap log — time, drink name, action (+1/−1)
- Labels localized (RU/DE) per current UI language
- Filename: `{event-name}-{YYYY-MM-DD}.csv`

## Persistence expectations

After page refresh, the following must remain on the same device/browser profile:

- Events and history
- Per-button counts
- Button configuration edits
- Selected RU/DE language (localStorage)

## Offline / PWA

- `manifest.webmanifest` + `/sw.js` cache-first for GET assets
- App logic is client-only; data in IndexedDB
- Full offline install behavior: verify on tablet separately

## Validation checklist

- [x] Create event
- [x] Tap increments count
- [x] Refresh keeps counts (manual)
- [ ] Long press 5s opens edit; save persists
- [ ] Undo decrements once then exits mode; tap log shows −1
- [ ] RU/DE switch; results and CSV labels follow locale
- [ ] Results view totals match counts
- [ ] CSV has no internal IDs; includes BOM, summary, totals, tap log
- [ ] `npm run build` passes
