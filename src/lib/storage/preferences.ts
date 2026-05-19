import type { ButtonCountPreset, Locale } from "@/lib/types";

const LOCALE_KEY = "rbbc.locale";
const LAST_EVENT_KEY = "rbbc.lastActiveEventId";
const BUTTON_COUNT_PRESET_KEY = "rbbc.buttonCountPreset";
const BUTTON_COUNT_PRESETS: readonly ButtonCountPreset[] = [4, 5, 6, 7, 8, 12, 16];

export function getLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  const value = localStorage.getItem(LOCALE_KEY);
  return value === "de" ? "de" : "ru";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function getButtonCountPreset(): ButtonCountPreset {
  if (typeof window === "undefined") return 16;
  const value = Number(localStorage.getItem(BUTTON_COUNT_PRESET_KEY));
  return BUTTON_COUNT_PRESETS.includes(value as ButtonCountPreset)
    ? (value as ButtonCountPreset)
    : 16;
}

export function setButtonCountPreset(preset: ButtonCountPreset): void {
  localStorage.setItem(BUTTON_COUNT_PRESET_KEY, String(preset));
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
