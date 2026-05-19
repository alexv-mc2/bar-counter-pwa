import { STORES, idbGet, idbGetAll, idbGetAllByIndex, idbPut } from "@/lib/db/indexeddb";
import { DRINK_TEMPLATES } from "@/lib/templates/drinks";
import type {
  BarEvent,
  ButtonTemplateSnapshot,
  DrinkButton,
  DrinkButtonConfig,
  TapLogEntry,
} from "@/lib/types";
import { setLastActiveEventId } from "@/lib/storage/preferences";

const TEMPLATE_DOC_ID = "latest";

function newId(): string {
  return crypto.randomUUID();
}

function defaultButtons(locale: "ru" | "de"): DrinkButton[] {
  const picks = DRINK_TEMPLATES.slice(0, 16);
  return picks.map((template, slotIndex) => ({
    id: newId(),
    slotIndex,
    name: template.labels[locale],
    templateId: template.id,
    category: template.category,
    icon: template.icon,
    color: template.color,
    count: 0,
  }));
}

function configFromButtons(buttons: DrinkButton[]): DrinkButtonConfig[] {
  return buttons.map((button) => {
    const { count, ...config } = button;
    void count;
    return config;
  });
}

export async function getButtonTemplate(): Promise<DrinkButtonConfig[] | null> {
  const doc = await idbGet<ButtonTemplateSnapshot & { id: string }>(
    STORES.buttonTemplate,
    TEMPLATE_DOC_ID,
  );
  return doc?.buttons ?? null;
}

async function saveButtonTemplate(buttons: DrinkButton[]): Promise<void> {
  const snapshot: ButtonTemplateSnapshot & { id: string } = {
    id: TEMPLATE_DOC_ID,
    buttons: configFromButtons(buttons),
    updatedAt: new Date().toISOString(),
  };
  await idbPut(STORES.buttonTemplate, snapshot);
}

export async function listEvents(): Promise<BarEvent[]> {
  const events = await idbGetAll<BarEvent>(STORES.events);
  return events.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getEvent(eventId: string): Promise<BarEvent | undefined> {
  return idbGet<BarEvent>(STORES.events, eventId);
}

export async function getActiveEvent(): Promise<BarEvent | undefined> {
  const events = await listEvents();
  return events.find((e) => e.isActive);
}

export async function createEvent(name: string, locale: "ru" | "de"): Promise<BarEvent> {
  const existing = await listEvents();
  for (const event of existing.filter((e) => e.isActive)) {
    event.isActive = false;
    event.updatedAt = new Date().toISOString();
    await idbPut(STORES.events, event);
  }

  const template = await getButtonTemplate();
  const buttons: DrinkButton[] = template
    ? template.map((config) => ({ ...config, id: newId(), count: 0 }))
    : defaultButtons(locale);

  const now = new Date().toISOString();
  const event: BarEvent = {
    id: newId(),
    name: name.trim() || (locale === "de" ? "Event" : "Событие"),
    createdAt: now,
    updatedAt: now,
    isActive: true,
    buttons,
  };

  await idbPut(STORES.events, event);
  await saveButtonTemplate(event.buttons);
  setLastActiveEventId(event.id);
  return event;
}

export async function saveEvent(event: BarEvent): Promise<BarEvent> {
  const updated: BarEvent = { ...event, updatedAt: new Date().toISOString() };
  await idbPut(STORES.events, updated);
  await saveButtonTemplate(updated.buttons);
  if (updated.isActive) {
    setLastActiveEventId(updated.id);
  }
  return updated;
}

export async function setActiveEvent(eventId: string): Promise<BarEvent | undefined> {
  const events = await listEvents();
  let selected: BarEvent | undefined;
  for (const event of events) {
    const isActive = event.id === eventId;
    if (isActive) selected = event;
    if (event.isActive !== isActive) {
      event.isActive = isActive;
      event.updatedAt = new Date().toISOString();
      await idbPut(STORES.events, event);
    }
  }
  if (selected) setLastActiveEventId(selected.id);
  return selected;
}

export async function closeActiveEvent(): Promise<void> {
  const active = await getActiveEvent();
  if (!active) return;
  active.isActive = false;
  active.updatedAt = new Date().toISOString();
  await idbPut(STORES.events, active);
  setLastActiveEventId(null);
}

export async function appendTapLog(entry: Omit<TapLogEntry, "id">): Promise<TapLogEntry> {
  const full: TapLogEntry = { ...entry, id: newId() };
  await idbPut(STORES.tapLogs, full);
  return full;
}

export async function getTapLogsForEvent(eventId: string): Promise<TapLogEntry[]> {
  const logs = await idbGetAllByIndex<TapLogEntry>(STORES.tapLogs, "eventId", eventId);
  return logs.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function updateButton(
  event: BarEvent,
  buttonId: string,
  patch: Partial<DrinkButton>,
): Promise<BarEvent> {
  const buttons = event.buttons.map((b) =>
    b.id === buttonId ? { ...b, ...patch } : b,
  );
  return saveEvent({ ...event, buttons });
}

export async function applyTap(
  event: BarEvent,
  buttonId: string,
  delta: 1 | -1,
): Promise<BarEvent> {
  const button = event.buttons.find((b) => b.id === buttonId);
  if (!button) return event;
  const nextCount = Math.max(0, button.count + delta);
  if (nextCount === button.count) return event;

  const buttons = event.buttons.map((b) =>
    b.id === buttonId ? { ...b, count: nextCount } : b,
  );
  const updated = await saveEvent({ ...event, buttons });
  const tapped = updated.buttons.find((b) => b.id === buttonId)!;
  await appendTapLog({
    timestamp: new Date().toISOString(),
    eventId: updated.id,
    buttonId: tapped.id,
    buttonName: tapped.name,
    category: tapped.category,
    icon: tapped.icon,
    color: tapped.color,
    delta,
  });
  return updated;
}
