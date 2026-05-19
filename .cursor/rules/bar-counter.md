# Rolling Badger Bar Counter

- Standalone local-first bar counter PWA for tablet use at events.
- Not part of brAIn / mc2-tech-brain architecture.
- No Supabase, Notion, OpenRouter, or other cloud backends.
- No auth, payments, admin panel, or user accounts.
- Persistence: IndexedDB for events, buttons, tap logs; localStorage only for locale and last active event id.
- Offline-first after first load; no server-side data APIs.
- UI languages: Russian (default) and German only.
- Tablet-first layout with large touch targets.
