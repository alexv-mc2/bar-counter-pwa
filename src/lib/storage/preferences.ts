import type {
  ButtonCountPreset,
  DrinkColor,
  DrinkIcon,
  DrinkTemplate,
  Locale,
} from "@/lib/types";
import { DRINK_TEMPLATES } from "@/lib/templates/drinks";
import { EVENT_CATEGORY_ORDER, normalizeDrinkCategory } from "@/lib/types";

const LOCALE_KEY = "rbbc.locale";
const LAST_EVENT_KEY = "rbbc.lastActiveEventId";
const BUTTON_COUNT_PRESET_KEY = "rbbc.buttonCountPreset";
const NEW_EVENT_QUEUE_DEFAULT_KEY = "rbbc.newEvent.queueEnabled";
const NEW_EVENT_CATEGORIES_DEFAULT_KEY = "rbbc.newEvent.categoriesEnabled";
const PIN_HASH_KEY = "rbbc.pinHash";
const CUSTOM_DRINK_TEMPLATES_KEY = "rbbc.customDrinkTemplates";
const BUTTON_COUNT_MIN = 1;
const BUTTON_COUNT_MAX = 16;
const DRINK_COLORS: DrinkColor[] = ["amber", "blue", "green", "red", "purple", "slate"];
const DRINK_ICONS: DrinkIcon[] = [
  "cocktail",
  "mocktail",
  "coffee",
  "cup",
  "bottle",
  "water",
  "beer",
  "wine",
  "shot",
  "tea",
  "other",
];
const BUILT_IN_TEMPLATE_IDS = new Set(DRINK_TEMPLATES.map((template) => template.id));

export function getLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  const value = localStorage.getItem(LOCALE_KEY);
  return value === "de" ? "de" : "ru";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function normalizeButtonCountPreset(value: number): ButtonCountPreset {
  if (!Number.isFinite(value)) return BUTTON_COUNT_MAX;
  return Math.min(BUTTON_COUNT_MAX, Math.max(BUTTON_COUNT_MIN, Math.round(value)));
}

export function getButtonCountPreset(): ButtonCountPreset {
  if (typeof window === "undefined") return BUTTON_COUNT_MAX;
  const stored = localStorage.getItem(BUTTON_COUNT_PRESET_KEY);
  if (stored == null) return BUTTON_COUNT_MAX;
  const value = Number(stored);
  return normalizeButtonCountPreset(value);
}

export function setButtonCountPreset(preset: ButtonCountPreset): void {
  localStorage.setItem(BUTTON_COUNT_PRESET_KEY, String(normalizeButtonCountPreset(preset)));
}

export function getNewEventQueueDefault(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(NEW_EVENT_QUEUE_DEFAULT_KEY) !== "false";
}

export function setNewEventQueueDefault(enabled: boolean): void {
  localStorage.setItem(NEW_EVENT_QUEUE_DEFAULT_KEY, enabled ? "true" : "false");
}

export function getNewEventCategoriesDefault(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NEW_EVENT_CATEGORIES_DEFAULT_KEY) === "true";
}

export function setNewEventCategoriesDefault(enabled: boolean): void {
  localStorage.setItem(NEW_EVENT_CATEGORIES_DEFAULT_KEY, enabled ? "true" : "false");
}

function stableTemplateHash(value: string): string {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function uniqueCustomTemplateId(
  template: DrinkTemplate,
  index: number,
  usedIds: Set<string>,
): string {
  const currentId = template.id.trim();
  if (
    currentId.startsWith("custom-") &&
    !BUILT_IN_TEMPLATE_IDS.has(currentId) &&
    !usedIds.has(currentId)
  ) {
    return currentId;
  }

  const source = `${template.labels.ru}:${template.labels.de}:${template.category}:${index}`;
  let nextId = `custom-${stableTemplateHash(source)}`;
  let suffix = 2;
  while (BUILT_IN_TEMPLATE_IDS.has(nextId) || usedIds.has(nextId)) {
    nextId = `custom-${stableTemplateHash(`${source}:${suffix}`)}`;
    suffix += 1;
  }
  return nextId;
}

function isDrinkTemplate(value: unknown): value is DrinkTemplate {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DrinkTemplate>;
  return (
    typeof item.id === "string" &&
    EVENT_CATEGORY_ORDER.includes(normalizeDrinkCategory(item.category)) &&
    DRINK_ICONS.includes(item.icon as DrinkIcon) &&
    DRINK_COLORS.includes(item.color as DrinkColor) &&
    typeof item.labels?.ru === "string" &&
    typeof item.labels?.de === "string"
  );
}

function normalizeCustomDrinkTemplates(values: unknown[]): {
  changed: boolean;
  templates: DrinkTemplate[];
} {
  let changed = false;
  const usedIds = new Set<string>();
  const templates: DrinkTemplate[] = [];

  values.forEach((value, index) => {
    if (!isDrinkTemplate(value)) {
      changed = true;
      return;
    }

    const source = value as DrinkTemplate;
    const ru = source.labels.ru.trim();
    const de = source.labels.de.trim() || ru;
    const category = normalizeDrinkCategory(source.category);
    const template: DrinkTemplate = {
      id: source.id.trim(),
      category,
      icon: source.icon,
      color: source.color,
      labels: { ru, de },
    };
    const nextId = uniqueCustomTemplateId(template, index, usedIds);
    if (
      nextId !== source.id ||
      category !== source.category ||
      ru !== source.labels.ru ||
      de !== source.labels.de
    ) {
      changed = true;
    }

    usedIds.add(nextId);
    templates.push({ ...template, id: nextId });
  });

  return { changed, templates: templates.slice(-64) };
}

export function getCustomDrinkTemplates(): DrinkTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_DRINK_TEMPLATES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const { changed, templates } = normalizeCustomDrinkTemplates(parsed);
    if (changed) {
      localStorage.setItem(CUSTOM_DRINK_TEMPLATES_KEY, JSON.stringify(templates));
    }
    return templates;
  } catch {
    return [];
  }
}

export function saveCustomDrinkTemplate(template: DrinkTemplate): DrinkTemplate[] {
  if (typeof window === "undefined") return [];
  const current = getCustomDrinkTemplates();
  const { templates } = normalizeCustomDrinkTemplates([...current, template]);
  const normalizedTemplate = templates.at(-1) ?? template;
  const next = [
    ...current.filter((item) => item.id !== normalizedTemplate.id),
    normalizedTemplate,
  ].slice(-64);
  localStorage.setItem(CUSTOM_DRINK_TEMPLATES_KEY, JSON.stringify(next));
  return next;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// Local convenience guard only, not security. It prevents casual taps on shared
// tablets but can be reset by clearing browser/app data.
function pinHash(pin: string): string {
  let hash = 0x811c9dc5;
  for (const char of `rbbc:${pin}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hasPin(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(PIN_HASH_KEY));
}

export function verifyPin(pin: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PIN_HASH_KEY) === pinHash(pin);
}

export function setPin(pin: string): void {
  if (!isValidPin(pin)) return;
  localStorage.setItem(PIN_HASH_KEY, pinHash(pin));
}

export function clearPin(): void {
  localStorage.removeItem(PIN_HASH_KEY);
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
