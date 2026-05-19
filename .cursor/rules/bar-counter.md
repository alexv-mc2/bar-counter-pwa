# Rolling Badger Bar Counter

- Standalone local-first bar counter PWA for tablet use at events.
- Not part of brAIn / mc2-tech-brain architecture.
- No Supabase, Notion, OpenRouter, or other cloud backends.
- No auth, payments, admin panel, or user accounts.
- Persistence: IndexedDB for events, buttons, tap logs, ordered totals, and pending queue; localStorage for locale, last active event id, visible button-count preference, and optional local PIN hash.
- Offline-first after first load; no server-side data APIs.
- UI languages: Russian (default) and German only.
- Tablet-first layout with large touch targets.
