export type Locale = "ru" | "de";

export type DrinkCategory =
  | "cocktail"
  | "mocktail"
  | "warm"
  | "soft"
  | "beer"
  | "wine"
  | "other";

export type ButtonCountPreset = number;

export type DrinkColor =
  | "amber"
  | "blue"
  | "green"
  | "red"
  | "purple"
  | "slate";

export type DrinkIcon =
  | "cocktail"
  | "mocktail"
  | "coffee"
  | "cup"
  | "bottle"
  | "water"
  | "beer"
  | "wine"
  | "shot"
  | "tea"
  | "other";

export interface DrinkTemplate {
  id: string;
  category: DrinkCategory;
  icon: DrinkIcon;
  color: DrinkColor;
  labels: { ru: string; de: string };
}

export interface DrinkButtonConfig {
  id: string;
  slotIndex: number;
  name: string;
  templateId?: string;
  category: DrinkCategory;
  icon: DrinkIcon;
  color: DrinkColor;
  isVisible?: boolean;
}

export interface DrinkButton extends DrinkButtonConfig {
  count: number;
  pendingCount: number;
}

export interface BarEvent {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  queueEnabled?: boolean;
  categoriesEnabled?: boolean;
  buttons: DrinkButton[];
}

export interface TapLogEntry {
  id: string;
  timestamp: string;
  eventId: string;
  buttonId: string;
  buttonName: string;
  category: DrinkCategory;
  icon: DrinkIcon;
  color: DrinkColor;
  delta: 1 | -1;
}

export interface ButtonTemplateSnapshot {
  buttons: DrinkButtonConfig[];
  updatedAt: string;
}

export const EVENT_CATEGORY_ORDER: DrinkCategory[] = [
  "cocktail",
  "mocktail",
  "beer",
  "wine",
  "soft",
  "warm",
  "other",
];

export function normalizeDrinkCategory(value: unknown): DrinkCategory {
  if (value === "coffee" || value === "tea") return "warm";
  return EVENT_CATEGORY_ORDER.includes(value as DrinkCategory)
    ? (value as DrinkCategory)
    : "other";
}
