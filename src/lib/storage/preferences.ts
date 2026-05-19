import type { Locale } from "@/lib/types";

const LOCALE_KEY = "rbbc.locale";
const LAST_EVENT_KEY = "rbbc.lastActiveEventId";

export function getLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  const value = localStorage.getItem(LOCALE_KEY);
  return value === "de" ? "de" : "ru";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function getLastActiveEventId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_EVENT_KEY);
}

export function setLastActiveEventId(eventId: string | null): void {
  if (eventId) {
    localStorage.setItem(LAST_EVENT_KEY, eventId);
  } else {
    localStorage.removeItem(LAST_EVENT_KEY);
  }
}
