# Rolling Badger Bar Counter — MVP Spec

## Product purpose

Tablet web app for bartenders to count drinks sold during bar events. Runs locally on the device with no cloud dependency.

## MVP scope

- Installable PWA (manifest + service worker shell cache)
- Create/continue/close events with local history
- 16 configurable drink buttons (name, template, category, icon, color, count badge)
- Tap +1; Undo mode then tap −1 (floor at 0)
- Long press 5s opens edit modal
- RU default UI; DE language switch (localStorage)
- IndexedDB persistence across refresh
- Reuse latest button layout for new events
- CSV export: summary, per-drink counts, full tap log

## Non-goals

- Prices, revenue, payments, stock, customers, users/roles
- Supabase, Notion, OpenRouter, LLMs, analytics dashboards
- XLSX export, cloud sync, backend APIs, auth

## Storage architecture

| Layer | Use |
|-------|-----|
| IndexedDB `events` | Bar events and button counts |
| IndexedDB `tapLogs` | Tap log entries (indexed by `eventId`) |
| IndexedDB `buttonTemplate` | Latest 16-button layout snapshot |
| localStorage | `rbbc.locale`, `rbbc.lastActiveEventId` |

## Data model

- **BarEvent**: id, name, createdAt, updatedAt, isActive, buttons[]
- **DrinkButton**: id, slotIndex, name, templateId?, category, icon, color, count
- **TapLogEntry**: id, timestamp, eventId, buttonId, buttonName, category, icon, color, delta (+1/−1)
- **DrinkTemplate**: predefined catalog with RU/DE labels

## Offline / PWA

- `manifest.webmanifest` + `/sw.js` cache-first for GET assets
- App logic is client-only; data in IndexedDB
- Full offline behavior depends on cached shell; **verify on device after install**

## Validation checklist

- [ ] Create event
- [ ] Tap increments count
- [ ] Refresh keeps counts
- [ ] Long press 5s opens edit; save persists
- [ ] Undo decrements once then exits mode
- [ ] RU/DE switch
- [ ] History lists events; CSV export
- [ ] New event reuses button template
- [ ] `npm run build` passes
