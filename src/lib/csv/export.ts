import { formatEventDate, formatTapTime, getEventTotals } from "@/lib/events/results";
import { csvLabels } from "@/lib/i18n/csv";
import type { BarEvent, Locale, TapLogEntry } from "@/lib/types";

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function formatDelta(delta: 1 | -1): string {
  return delta > 0 ? "+1" : "-1";
}

export function buildEventCsv(
  event: BarEvent,
  tapLogs: TapLogEntry[],
  locale: Locale,
): string {
  const labels = csvLabels(locale);
  const { total, drinks } = getEventTotals(event, locale);
  const lines: string[] = [];

  lines.push(`${labels.event},${escapeCsv(event.name)}`);
  lines.push(`${labels.date},${formatEventDate(event.createdAt, locale)}`);
  lines.push(`${labels.totalDrinks},${total}`);
  lines.push("");
  lines.push(`${labels.drink},${labels.quantity}`);
  for (const drink of drinks) {
    lines.push(`${escapeCsv(drink.name)},${drink.count}`);
  }
  lines.push("");
  lines.push(labels.tapLogTitle);
  lines.push(`${labels.tapTime},${labels.tapDrink},${labels.tapAction}`);
  for (const log of tapLogs) {
    lines.push(
      [
        formatTapTime(log.timestamp, locale),
        escapeCsv(log.buttonName),
        formatDelta(log.delta),
      ].join(","),
    );
  }

  return lines.join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function eventCsvFilename(event: BarEvent): string {
  const safeName = event.name.replace(/[^a-zA-Z0-9а-яА-ЯёЁäöüß\-_]+/gi, "_");
  const date = new Date(event.createdAt).toISOString().slice(0, 10);
  return `${safeName || "event"}-${date}.csv`;
}
