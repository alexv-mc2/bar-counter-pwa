import type { BarEvent, DrinkButton, Locale } from "@/lib/types";

export interface EventTotals {
  total: number;
  drinks: DrinkButton[];
}

export interface QueueTotals {
  total: number;
  drinks: DrinkButton[];
}

export function getEventTotals(event: BarEvent, locale: Locale): EventTotals {
  const total = event.buttons.reduce((sum, button) => sum + button.count, 0);
  const drinks = event.buttons
    .filter((button) => button.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, locale === "de" ? "de" : "ru");
    });
  return { total, drinks };
}

export function getPendingQueue(event: BarEvent): QueueTotals {
  const total = event.buttons.reduce((sum, button) => sum + button.pendingCount, 0);
  const drinks = event.buttons
    .filter((button) => button.pendingCount > 0)
    .sort((a, b) => a.slotIndex - b.slotIndex);
  return { total, drinks };
}

export function formatEventDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return date.toLocaleDateString(locale === "de" ? "de-DE" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatEventDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return date.toLocaleString(locale === "de" ? "de-DE" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTapTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(locale === "de" ? "de-DE" : "ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
