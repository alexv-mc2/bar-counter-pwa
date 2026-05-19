export type Locale = "ru" | "de";

export type DrinkCategory =
  | "cocktail"
  | "mocktail"
  | "coffee"
  | "soft"
  | "beer"
  | "wine"
  | "tea"
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
