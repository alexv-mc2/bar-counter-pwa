import type { BarEvent, TapLogEntry } from "@/lib/types";

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildEventCsv(event: BarEvent, tapLogs: TapLogEntry[]): string {
  const lines: string[] = [];
  const total = event.buttons.reduce((sum, b) => sum + b.count, 0);

  lines.push("section,key,value");
  lines.push(["summary", "event_id", escapeCsv(event.id)].join(","));
  lines.push(["summary", "event_name", escapeCsv(event.name)].join(","));
  lines.push(["summary", "created_at", escapeCsv(event.createdAt)].join(","));
  lines.push(["summary", "updated_at", escapeCsv(event.updatedAt)].join(","));
  lines.push(["summary", "is_active", escapeCsv(event.isActive ? "yes" : "no")].join(","));
  lines.push(["summary", "total_drinks", escapeCsv(total)].join(","));
  lines.push("");

  lines.push(
    "drinks,slot,button_id,name,category,icon,color,count",
  );
  for (const button of [...event.buttons].sort((a, b) => a.slotIndex - b.slotIndex)) {
    lines.push(
      [
        "drink",
        button.slotIndex,
        escapeCsv(button.id),
        escapeCsv(button.name),
        escapeCsv(button.category),
        escapeCsv(button.icon),
        escapeCsv(button.color),
        button.count,
      ].join(","),
    );
  }
  lines.push("");

  lines.push(
    "tap_log,timestamp,event_id,button_id,button_name,category,icon,color,delta",
  );
  for (const log of tapLogs) {
    lines.push(
      [
        "tap",
        escapeCsv(log.timestamp),
        escapeCsv(log.eventId),
        escapeCsv(log.buttonId),
        escapeCsv(log.buttonName),
        escapeCsv(log.category),
        escapeCsv(log.icon),
        escapeCsv(log.color),
        log.delta,
      ].join(","),
    );
  }

  return lines.join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
