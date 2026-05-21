import {
  STORES,
  idbDelete,
  idbGet,
  idbGetAll,
  idbGetAllByIndex,
  idbPut,
} from "@/lib/db/indexeddb";
import { DRINK_TEMPLATES } from "@/lib/templates/drinks";
import type {
  BarEvent,
  ButtonTemplateSnapshot,
  DrinkButton,
  DrinkButtonConfig,
  DrinkTemplate,
  TapLogEntry,
} from "@/lib/types";
import { normalizeDrinkCategory } from "@/lib/types";
import { getLastActiveEventId, setLastActiveEventId } from "@/lib/storage/preferences";

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
    isVisible: true,
    count: 0,
    pendingCount: 0,
  }));
}

function configFromButtons(buttons: DrinkButton[]): DrinkButtonConfig[] {
  return buttons.map((button) => {
    const { count, pendingCount, ...config } = button;
    void count;
    void pendingCount;
    return config;
  });
}

function normalizeCount(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function normalizeButton(button: DrinkButton): DrinkButton {
  const count = normalizeCount(button.count);
  const pendingCount = Math.min(count, normalizeCount(button.pendingCount));
  return {
    ...button,
    category: normalizeDrinkCategory(button.category),
    isVisible: button.isVisible !== false,
    count,
    pendingCount,
  };
}

function normalizeEvent(event: BarEvent): BarEvent {
  return {
    ...event,
    queueEnabled: event.queueEnabled !== false,
    categoriesEnabled: event.categoriesEnabled === true,
    buttons: event.buttons.map(normalizeButton),
  };
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
  const events = (await idbGetAll<BarEvent>(STORES.events)).map(normalizeEvent);
  return events.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getEvent(eventId: string): Promise<BarEvent | undefined> {
  const event = await idbGet<BarEvent>(STORES.events, eventId);
  return event ? normalizeEvent(event) : undefined;
}

export async function getActiveEvent(): Promise<BarEvent | undefined> {
  const events = await listEvents();
  return events.find((e) => e.isActive);
}

export async function createEvent(name: string, locale: "ru" | "de"): Promise<BarEvent> {
  return createEventWithOptions({
    name,
    locale,
  });
}

export async function createEventWithOptions({
  name,
  locale,
  selectedTemplates,
  queueEnabled = true,
  categoriesEnabled = false,
}: {
  name: string;
  locale: "ru" | "de";
  selectedTemplates?: DrinkTemplate[];
  queueEnabled?: boolean;
  categoriesEnabled?: boolean;
}): Promise<BarEvent> {
  const existing = await listEvents();
  for (const event of existing.filter((e) => e.isActive)) {
    event.isActive = false;
    event.updatedAt = new Date().toISOString();
    await idbPut(STORES.events, event);
  }

  const template = await getButtonTemplate();
  const sourceTemplates = selectedTemplates
    ?.slice(0, 16)
    .map((entry, slotIndex) => ({
      id: newId(),
      slotIndex,
      name: entry.labels[locale],
      templateId: entry.id,
      category: normalizeDrinkCategory(entry.category),
      icon: entry.icon,
      color: entry.color,
      isVisible: true,
      count: 0,
      pendingCount: 0,
    }));
  const buttons: DrinkButton[] = sourceTemplates?.length
    ? sourceTemplates
    : template
    ? template.map((config) => ({
        ...config,
        id: newId(),
        category: normalizeDrinkCategory(config.category),
        isVisible: config.isVisible !== false,
        count: 0,
        pendingCount: 0,
      }))
    : defaultButtons(locale);

  const now = new Date().toISOString();
  const event: BarEvent = {
    id: newId(),
    name: name.trim() || (locale === "de" ? "Event" : "Событие"),
    createdAt: now,
    updatedAt: now,
    isActive: true,
    queueEnabled,
    categoriesEnabled,
    buttons,
  };

  await idbPut(STORES.events, event);
  await saveButtonTemplate(event.buttons);
  setLastActiveEventId(event.id);
  return event;
}

export async function saveEvent(event: BarEvent): Promise<BarEvent> {
  const updated: BarEvent = normalizeEvent({
    ...event,
    updatedAt: new Date().toISOString(),
  });
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

export async function deleteEvent(eventId: string): Promise<void> {
  const event = await getEvent(eventId);
  await idbDelete(STORES.events, eventId);
  const logs = await getTapLogsForEvent(eventId);
  await Promise.all(logs.map((log) => idbDelete(STORES.tapLogs, log.id)));
  if (event?.isActive || getLastActiveEventId() === eventId) {
    setLastActiveEventId(null);
  }
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

export async function orderDrink(event: BarEvent, buttonId: string): Promise<BarEvent> {
  return orderDrinkWithQueueMode(event, buttonId, event.queueEnabled !== false);
}

export async function orderDrinkWithQueueMode(
  event: BarEvent,
  buttonId: string,
  queueEnabled: boolean,
): Promise<BarEvent> {
  const normalized = normalizeEvent(event);
  const button = normalized.buttons.find((b) => b.id === buttonId);
  if (!button) return event;

  const buttons = normalized.buttons.map((b) =>
    b.id === buttonId
      ? {
          ...b,
          count: b.count + 1,
          pendingCount: queueEnabled ? b.pendingCount + 1 : b.pendingCount,
        }
      : b,
  );
  const updated = await saveEvent({ ...normalized, buttons });
  const tapped = updated.buttons.find((b) => b.id === buttonId)!;
  await appendTapLog({
    timestamp: new Date().toISOString(),
    eventId: updated.id,
    buttonId: tapped.id,
    buttonName: tapped.name,
    category: tapped.category,
    icon: tapped.icon,
    color: tapped.color,
    delta: 1,
  });
  return updated;
}

export async function undoDrink(event: BarEvent, buttonId: string): Promise<BarEvent> {
  const normalized = normalizeEvent(event);
  const button = normalized.buttons.find((b) => b.id === buttonId);
  if (!button || button.count <= 0) return normalized;

  const buttons = normalized.buttons.map((b) =>
    b.id === buttonId
      ? {
          ...b,
          count: Math.max(0, b.count - 1),
          pendingCount: b.pendingCount > 0 ? b.pendingCount - 1 : 0,
        }
      : b,
  );
  const updated = await saveEvent({ ...normalized, buttons });
  const tapped = updated.buttons.find((b) => b.id === buttonId)!;
  await appendTapLog({
    timestamp: new Date().toISOString(),
    eventId: updated.id,
    buttonId: tapped.id,
    buttonName: tapped.name,
    category: tapped.category,
    icon: tapped.icon,
    color: tapped.color,
    delta: -1,
  });
  return updated;
}

export async function serveDrink(
  event: BarEvent,
  buttonId: string,
  amount = 1,
): Promise<BarEvent> {
  const normalized = normalizeEvent(event);
  const serveAmount = normalizeCount(amount);
  if (serveAmount <= 0) return normalized;
  const button = normalized.buttons.find((b) => b.id === buttonId);
  if (!button || button.pendingCount <= 0) return normalized;

  const buttons = normalized.buttons.map((b) =>
    b.id === buttonId
      ? { ...b, pendingCount: Math.max(0, b.pendingCount - serveAmount) }
      : b,
  );
  return saveEvent({ ...normalized, buttons });
}

export async function applyTap(
  event: BarEvent,
  buttonId: string,
  delta: 1 | -1,
): Promise<BarEvent> {
  return delta > 0 ? orderDrink(event, buttonId) : undoDrink(event, buttonId);
}
