"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  AddProductButton,
  DrinkGridButton,
  type DrinkCardScale,
} from "@/components/DrinkGridButton";
import { EditButtonModal } from "@/components/EditButtonModal";
import { EventResultsView } from "@/components/EventResultsView";
import { buildEventCsv, downloadCsv, eventCsvFilename } from "@/lib/csv/export";
import { getPendingQueue } from "@/lib/events/results";
import { t } from "@/lib/i18n/messages";
import { DRINK_TEMPLATES } from "@/lib/templates/drinks";
import {
  NavCurrentIcon,
  NavHistoryIcon,
  NavSettingsIcon,
  NavTemplateIcon,
} from "@/lib/ui/icons";
import {
  closeActiveEvent,
  createEventWithOptions,
  deleteEvent,
  getActiveEvent,
  getEvent,
  getTapLogsForEvent,
  listEvents,
  orderDrinkWithQueueMode,
  saveEvent,
  serveDrink,
  setActiveEvent,
  undoDrink,
  updateButton,
} from "@/lib/storage/events";
import {
  clearPin,
  getButtonCountPreset,
  getCustomDrinkTemplates,
  getLastActiveEventId,
  getLocale,
  getNewEventCategoriesDefault,
  getNewEventQueueDefault,
  hasPin,
  isValidPin,
  normalizeButtonCountPreset,
  saveCustomDrinkTemplate,
  setButtonCountPreset,
  setLocale,
  setNewEventCategoriesDefault as setNewEventCategoriesDefaultPref,
  setNewEventQueueDefault as setNewEventQueueDefaultPref,
  setPin,
  verifyPin,
} from "@/lib/storage/preferences";
import type {
  BarEvent,
  ButtonCountPreset,
  DrinkCategory,
  DrinkButton,
  DrinkColor,
  DrinkIcon,
  DrinkTemplate,
  Locale,
} from "@/lib/types";
import { EVENT_CATEGORY_ORDER as CATEGORY_ORDER } from "@/lib/types";

type Screen = "home" | "create" | "event" | "history";
type Messages = ReturnType<typeof t>;
type EventMessage = "finishBlockedByQueue";
type ProductGridStyle = CSSProperties & {
  "--rbbc-grid-cols": number;
  "--rbbc-grid-rows": number;
  "--rbbc-grid-mobile-cols": number;
  "--rbbc-grid-mobile-rows": number;
};

const BUTTON_COUNT_PRESETS: readonly ButtonCountPreset[] = [4, 5, 6, 7, 8, 12, 16];
const MIN_BUTTON_COUNT = 1;
const MAX_BUTTON_COUNT = 16;
const CATEGORY_DEFAULTS: Record<DrinkCategory, { icon: DrinkIcon; color: DrinkColor }> = {
  cocktail: { icon: "cocktail", color: "red" },
  mocktail: { icon: "mocktail", color: "green" },
  beer: { icon: "beer", color: "amber" },
  wine: { icon: "wine", color: "red" },
  soft: { icon: "cup", color: "blue" },
  warm: { icon: "coffee", color: "amber" },
  other: { icon: "other", color: "slate" },
};

function getProductGridLayout(count: number): {
  columns: number;
  rows: number;
  mobileColumns: number;
  mobileRows: number;
  cardScale: DrinkCardScale;
} {
  if (count <= 1) {
    return { columns: 1, rows: 1, mobileColumns: 1, mobileRows: 1, cardScale: "large" };
  }
  if (count <= 2) {
    return { columns: 2, rows: 1, mobileColumns: 1, mobileRows: 2, cardScale: "large" };
  }
  if (count <= 3) {
    return { columns: 3, rows: 1, mobileColumns: 2, mobileRows: 2, cardScale: "large" };
  }
  if (count <= 4) {
    return { columns: 2, rows: 2, mobileColumns: 2, mobileRows: 2, cardScale: "large" };
  }
  if (count <= 6) {
    return { columns: 3, rows: 2, mobileColumns: 2, mobileRows: 3, cardScale: "large" };
  }
  if (count <= 8) {
    return { columns: 4, rows: 2, mobileColumns: 2, mobileRows: 4, cardScale: "medium" };
  }
  if (count <= 12) {
    return { columns: 4, rows: 3, mobileColumns: 3, mobileRows: 4, cardScale: "compact" };
  }
  return { columns: 4, rows: 4, mobileColumns: 2, mobileRows: 8, cardScale: "compact" };
}

function formatButtonCountPreset(preset: ButtonCountPreset, locale: Locale) {
  if (locale === "de") return `${preset} Tasten`;
  if (preset === 1) return "1 кнопка";
  if (preset >= 2 && preset <= 4) return `${preset} кнопки`;
  return `${preset} кнопок`;
}

function newCustomTemplateId(): string {
  return `custom-${Date.now()}-${crypto.randomUUID()}`;
}

function newButtonId(): string {
  return `button-${Date.now()}-${crypto.randomUUID()}`;
}

function canReuseButtonSlot(button: DrinkButton): boolean {
  return button.count <= 0 && button.pendingCount <= 0;
}

function findAddButtonSlot(
  sortedButtons: DrinkButton[],
  preset: ButtonCountPreset,
): DrinkButton | null {
  const presetWindow = sortedButtons.slice(0, Math.min(preset, sortedButtons.length));
  return (
    presetWindow.find((button) => button.isVisible === false && canReuseButtonSlot(button)) ??
    sortedButtons
      .slice(Math.min(preset, sortedButtons.length))
      .find((button) => canReuseButtonSlot(button)) ??
    sortedButtons.find((button) => button.isVisible === false && canReuseButtonSlot(button)) ??
    null
  );
}

function rankVisibleSlot(sortedButtons: DrinkButton[], buttonId: string): number {
  return sortedButtons
    .filter((button) => button.isVisible !== false)
    .findIndex((button) => button.id === buttonId);
}

function nextSlotIndex(sortedButtons: DrinkButton[]): number {
  const used = new Set(sortedButtons.map((button) => button.slotIndex));
  for (let index = 0; index < MAX_BUTTON_COUNT; index += 1) {
    if (!used.has(index)) return index;
  }
  return sortedButtons.length;
}

function groupTemplatesByCategory(templates: DrinkTemplate[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: templates.filter((template) => template.category === category),
  }));
}

function firstCategoryWithButtons(buttons: DrinkButton[]): DrinkCategory {
  for (const category of CATEGORY_ORDER) {
    if (buttons.some((button) => button.category === category)) {
      return category;
    }
  }
  return "other";
}

function RollingBadgerLogo() {
  return (
    // Static public asset is required here so the logo path stays literal.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/rolling-badger-logo.png"
      alt="Rolling Badger Bar"
      className="h-12 w-28 select-none object-contain object-left sm:h-14 sm:w-36 lg:h-16 lg:w-44"
      draggable={false}
    />
  );
}

function UndoIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 8a5.5 5.5 0 1 1 1.1 3.4" />
      <polyline points="2.5 3 2.5 8 7.5 8" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="1" y="10" width="3" height="4" rx="1" />
      <rect x="6" y="6" width="3" height="8" rx="1" />
      <rect x="11" y="2" width="3" height="12" rx="1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h10M8 2v8M5 7l3 3 3-3" />
    </svg>
  );
}

function StopSquareIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h8M4 8h8M4 12h8" />
      <circle cx="2" cy="4" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="2" cy="8" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="2" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 4h12M6 4V2h4v2M5 6v7M8 6v7M11 6v7" />
      <path d="M4 4l1 10h6l1-10" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 12L6 8l4-4" />
    </svg>
  );
}

function EventHero({
  event,
  totalCount,
  m,
}: {
  event: BarEvent | null;
  totalCount: number;
  m: Messages;
}) {
  if (!event) {
    return (
      <div className="min-w-0 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
          Rolling Badger
        </p>
        <h1 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
          Bar Counter
        </h1>
      </div>
    );
  }

  return (
    <div className="min-w-0 text-center">
      <h1 className="truncate text-2xl font-black tracking-tight text-stone-950 sm:text-3xl lg:text-4xl 2xl:text-5xl">
        {event.name}
      </h1>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase sm:text-sm ${
            event.isActive ? "bg-red-700 text-white" : "bg-stone-200 text-stone-700"
          }`}
        >
          {event.isActive ? m.active : m.closed}
        </span>
        <span className="text-sm font-semibold text-stone-700 sm:text-base">
          {m.resultsTotal}
        </span>
        <span className="text-3xl font-black leading-none text-red-700 sm:text-4xl">
          {totalCount}
        </span>
      </div>
    </div>
  );
}

function IconButton({
  children,
  icon,
  variant,
  emphasis = "normal",
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  icon: ReactNode;
  variant: "solid" | "outline" | "danger";
  emphasis?: "normal" | "featured";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    solid: "bg-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800",
    danger: "bg-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800",
    outline:
      "border-2 border-stone-300 bg-white/80 text-stone-950 shadow-sm active:bg-stone-100",
  };
  const emphasisClasses = {
    normal: "min-h-10 px-3 py-2 text-sm sm:min-h-11 sm:px-4 lg:min-h-12",
    featured:
      "min-h-12 px-4 py-2.5 text-base shadow-[0_8px_18px_rgba(120,53,15,0.14)] sm:min-h-14 sm:px-5 sm:text-lg lg:text-xl",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex h-full min-w-0 items-center justify-center gap-2 rounded-xl text-center font-black leading-tight transition disabled:cursor-not-allowed disabled:opacity-45 lg:rounded-2xl",
        emphasisClasses[emphasis],
        variants[variant],
        className,
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}

function SidePanel({
  activeEvent,
  totalCount,
  queueEnabled,
  m,
  openResults,
  openQueue,
  goHistory,
  openTemplate,
  openSettings,
}: {
  activeEvent: BarEvent;
  totalCount: number;
  queueEnabled: boolean;
  m: Messages;
  openResults: () => void;
  openQueue: () => void;
  goHistory: () => void;
  openTemplate: () => void;
  openSettings: () => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-red-200/70 bg-white/85 shadow-[0_4px_18px_rgba(120,53,15,0.10)] min-[1800px]:flex">
      <div className="border-b border-stone-200 p-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-red-700">
          <NavCurrentIcon className="h-7 w-7" />
          {m.currentEvent}
        </div>
        <h2 className="mt-5 truncate text-2xl font-black text-stone-950">
          {activeEvent.name}
        </h2>
        <span className="mt-2 inline-flex rounded-lg bg-red-700 px-2.5 py-1 text-xs font-black uppercase text-white">
          {activeEvent.isActive ? m.active : m.closed}
        </span>
        <p className="mt-6 text-sm font-semibold text-stone-600">{m.resultsTotal}</p>
        <p className="text-5xl font-black leading-none text-red-700">{totalCount}</p>
      </div>
      <div className="divide-y divide-stone-200">
        <PanelButton icon={<BarChartIcon />} onClick={openResults}>
          {m.results}
        </PanelButton>
        <PanelButton icon={<QueueIcon />} onClick={openQueue} disabled={!queueEnabled}>
          {m.queue}
        </PanelButton>
        <PanelButton icon={<NavHistoryIcon className="h-5 w-5" />} onClick={goHistory}>
          {m.history}
        </PanelButton>
        <PanelButton icon={<NavTemplateIcon className="h-5 w-5" />} onClick={openTemplate}>
          {m.drinkTemplate}
        </PanelButton>
        <PanelButton icon={<NavSettingsIcon className="h-5 w-5" />} onClick={openSettings}>
          {m.settings}
        </PanelButton>
      </div>
      <div className="mt-auto border-t border-stone-200 bg-stone-50/80 p-4">
        <p className="text-sm font-semibold leading-snug text-stone-600">
          {m.longPressHint}
        </p>
      </div>
    </aside>
  );
}

function CategorySideMenu({
  categories,
  pendingCounts,
  selectedCategory,
  onSelect,
  m,
}: {
  categories: DrinkCategory[];
  pendingCounts: Record<DrinkCategory, number>;
  selectedCategory: DrinkCategory;
  onSelect: (category: DrinkCategory) => void;
  m: Messages;
}) {
  return (
    <aside className="w-[17rem] shrink-0 overflow-hidden rounded-2xl border border-red-200/70 bg-white/85 p-2 shadow-[0_4px_18px_rgba(120,53,15,0.10)]">
      <div className="flex h-full flex-col gap-2">
        {categories.map((category) => {
          const selected = selectedCategory === category;
          const pendingCount = pendingCounts[category];
          return (
            <button
              key={category}
              type="button"
              data-category-side={category}
              onClick={() => onSelect(category)}
              className={`min-h-14 rounded-2xl border-2 px-3 py-2 text-left text-base font-black transition ${
                selected
                  ? "border-red-700 bg-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)]"
                  : "border-stone-300 bg-white text-stone-700 active:bg-stone-100"
              }`}
            >
              <span className="block truncate">{m.categories[category]}</span>
              {pendingCount > 0 && (
                <span
                  className={[
                    "mt-1 inline-flex min-w-9 items-center justify-center rounded-full px-2 py-0.5 text-sm font-black shadow-sm rbbc-queue-badge-active",
                    selected ? "bg-white text-red-700" : "bg-red-700 text-white",
                  ].join(" ")}
                  data-category-pending={category}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PanelButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left font-bold text-stone-900 disabled:cursor-not-allowed disabled:text-stone-400 disabled:opacity-45"
    >
      <span className="flex items-center gap-3">
        {icon}
        {children}
      </span>
      <span className="text-xl text-stone-400">{disabled ? mDash : "›"}</span>
    </button>
  );
}

const mDash = "—";

function BottomNav({
  screen,
  activeEvent,
  m,
  goEvent,
  goHistory,
  openTemplate,
  openSettings,
}: {
  screen: Screen;
  activeEvent: BarEvent | null;
  m: Messages;
  goEvent: () => void;
  goHistory: () => void;
  openTemplate: () => void;
  openSettings: () => void;
}) {
  const itemClass =
    "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 border-t-4 px-1 text-[0.68rem] font-black leading-tight sm:min-h-14 sm:gap-1 sm:px-2 sm:text-xs lg:text-sm";

  return (
    <nav className="flex shrink-0 border-t border-stone-200 bg-white/95 shadow-[0_-4px_16px_rgba(120,53,15,0.06)]">
      <button
        type="button"
        onClick={goEvent}
        disabled={!activeEvent}
        className={`${itemClass} ${
          screen === "event"
            ? "border-red-700 text-red-700"
            : "border-transparent text-stone-500 disabled:text-stone-300"
        }`}
      >
        <NavCurrentIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        {m.currentEvent}
      </button>
      <button
        type="button"
        onClick={goHistory}
        className={`${itemClass} ${
          screen === "history" ? "border-red-700 text-red-700" : "border-transparent text-stone-500"
        }`}
      >
        <NavHistoryIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        {m.history}
      </button>
      <button
        type="button"
        onClick={openTemplate}
        className={`${itemClass} border-transparent text-stone-500`}
      >
        <NavTemplateIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        {m.drinkTemplate}
      </button>
      <button
        type="button"
        onClick={openSettings}
        className={`${itemClass} border-transparent text-stone-500`}
      >
        <NavSettingsIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        {m.settings}
      </button>
    </nav>
  );
}

function ButtonTemplateModal({
  locale,
  m,
  currentPreset,
  onApply,
  onClose,
}: {
  locale: Locale;
  m: Messages;
  currentPreset: ButtonCountPreset;
  onApply: (preset: ButtonCountPreset) => void;
  onClose: () => void;
}) {
  const [draftValue, setDraftValue] = useState(String(currentPreset));
  const draftPreset = normalizeButtonCountPreset(Number(draftValue));
  const stepDraft = (delta: number) => {
    setDraftValue(String(normalizeButtonCountPreset(draftPreset + delta)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="w-full max-w-xl rounded-3xl border border-red-100 bg-[#fffdfa] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="button-template-title"
      >
        <h2 id="button-template-title" className="text-3xl font-black text-stone-950">
          {m.buttonTemplateTitle}
        </h2>
        <p className="mt-2 text-base font-black uppercase tracking-wide text-stone-500">
          {m.buttonCountLabel}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => stepDraft(-1)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-stone-300 bg-white text-3xl font-black text-stone-900 active:bg-stone-100"
            aria-label="-1"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_BUTTON_COUNT}
            max={MAX_BUTTON_COUNT}
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={() => setDraftValue(String(draftPreset))}
            className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-red-200 bg-white px-5 text-center text-3xl font-black text-stone-950 focus:border-red-600 focus:outline-none"
            aria-label={m.buttonCountLabel}
          />
          <button
            type="button"
            onClick={() => stepDraft(1)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-stone-300 bg-white text-3xl font-black text-stone-900 active:bg-stone-100"
            aria-label="+1"
          >
            +
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BUTTON_COUNT_PRESETS.map((preset) => {
            const selected = draftPreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setDraftValue(String(preset))}
                className={`min-h-16 rounded-2xl border-2 px-4 py-3 text-lg font-black transition ${
                  selected
                    ? "border-red-700 bg-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)]"
                    : "border-stone-300 bg-white text-stone-800 active:bg-stone-100"
                }`}
              >
                {formatButtonCountPreset(preset, locale)}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
          >
            {m.cancel}
          </button>
          <button
            type="button"
            onClick={() => onApply(draftPreset)}
            className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
          >
            {m.apply}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  locale,
  m,
  activeEvent,
  pinEnabled,
  initialQueueEnabled,
  initialCategoriesEnabled,
  onLocaleChange,
  onApplyEventSettings,
  onPinEnabledChange,
  onClose,
}: {
  locale: Locale;
  m: Messages;
  activeEvent: BarEvent | null;
  pinEnabled: boolean;
  initialQueueEnabled: boolean;
  initialCategoriesEnabled: boolean;
  onLocaleChange: (locale: Locale) => void;
  onApplyEventSettings: (queueEnabled: boolean, categoriesEnabled: boolean) => Promise<void>;
  onPinEnabledChange: (enabled: boolean) => void;
  onClose: () => void;
}) {
  const [queueEnabledDraft, setQueueEnabledDraft] = useState(initialQueueEnabled);
  const [categoriesEnabledDraft, setCategoriesEnabledDraft] = useState(initialCategoriesEnabled);
  const [saving, setSaving] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [repeatPin, setRepeatPin] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  const clearInputs = () => {
    setCurrentPin("");
    setNewPin("");
    setRepeatPin("");
  };

  const handleSavePin = () => {
    if (pinEnabled && !verifyPin(currentPin)) {
      setMessage({ type: "error", text: m.wrongPin });
      return;
    }
    if (!isValidPin(newPin)) {
      setMessage({ type: "error", text: m.pinMustBeFourDigits });
      return;
    }
    if (newPin !== repeatPin) {
      setMessage({ type: "error", text: m.pinMismatch });
      return;
    }
    setPin(newPin);
    onPinEnabledChange(true);
    clearInputs();
    setMessage({ type: "success", text: m.pinSaved });
  };

  const handleResetPin = () => {
    if (!pinEnabled) return;
    if (!verifyPin(currentPin)) {
      setMessage({ type: "error", text: m.wrongPin });
      return;
    }
    clearPin();
    onPinEnabledChange(false);
    clearInputs();
    setMessage({ type: "success", text: m.pinDisabled });
  };

  const handleSaveEventSettings = async () => {
    setSaving(true);
    await onApplyEventSettings(queueEnabledDraft, categoriesEnabledDraft);
    setSaving(false);
    onClose();
  };

  const settingsTitle = activeEvent ? m.currentEventSettingsTitle : m.newEventSettingsTitle;
  const settingsHint = activeEvent ? m.currentEventSettingsHint : m.newEventSettingsHint;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-red-100 bg-[#fffdfa] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between border-b border-red-100 px-6 py-4">
          <h2 id="settings-title" className="text-3xl font-black text-stone-950">
            {m.settings}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-stone-300 bg-white px-3 py-1.5 text-sm font-black text-stone-700 active:bg-stone-100"
          >
            {m.close}
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="rounded-2xl border border-red-100 bg-white/80 p-4">
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-stone-500">
              {m.language}
            </p>
            <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
          </div>

          <div className="rounded-2xl border border-red-100 bg-white/80 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-stone-500">
              {settingsTitle}
            </p>
            <p className="mt-2 text-sm font-semibold text-stone-600">{settingsHint}</p>
            {activeEvent && (
              <p className="mt-2 text-sm font-black text-stone-900">{activeEvent.name}</p>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setQueueEnabledDraft((current) => !current)}
                className={`min-h-12 rounded-2xl border-2 px-4 py-3 text-left font-black ${
                  queueEnabledDraft
                    ? "border-red-700 bg-red-50 text-red-800"
                    : "border-stone-300 bg-white text-stone-600"
                }`}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-current text-sm leading-none">
                  {queueEnabledDraft ? "✓" : ""}
                </span>
                {m.queueEnabledLabel}
              </button>
              <button
                type="button"
                onClick={() => setCategoriesEnabledDraft((current) => !current)}
                className={`min-h-12 rounded-2xl border-2 px-4 py-3 text-left font-black ${
                  categoriesEnabledDraft
                    ? "border-red-700 bg-red-50 text-red-800"
                    : "border-stone-300 bg-white text-stone-600"
                }`}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-current text-sm leading-none">
                  {categoriesEnabledDraft ? "✓" : ""}
                </span>
                {m.categoriesEnabledLabel}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-wide text-stone-500">
                {m.pinCode}
              </p>
              <span
                className={`rounded-lg px-3 py-1 text-xs font-black uppercase ${
                  pinEnabled ? "bg-red-700 text-white" : "bg-stone-200 text-stone-600"
                }`}
              >
                {pinEnabled ? m.changePin : m.setPin}
              </span>
            </div>

            {pinEnabled && (
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-black text-stone-600">
                  {m.enterPin}
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ""))}
                  className="h-14 w-full rounded-2xl border-2 border-stone-200 bg-white px-5 text-2xl font-black tracking-[0.3em] text-stone-950 focus:border-red-600 focus:outline-none"
                />
              </label>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-black text-stone-600">
                  {m.newPin}
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))}
                  className="h-14 w-full rounded-2xl border-2 border-stone-200 bg-white px-5 text-2xl font-black tracking-[0.3em] text-stone-950 focus:border-red-600 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-black text-stone-600">
                  {m.repeatPin}
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={repeatPin}
                  onChange={(event) => setRepeatPin(event.target.value.replace(/\D/g, ""))}
                  className="h-14 w-full rounded-2xl border-2 border-stone-200 bg-white px-5 text-2xl font-black tracking-[0.3em] text-stone-950 focus:border-red-600 focus:outline-none"
                />
              </label>
            </div>

            {message && (
              <p
                className={`mt-3 rounded-xl px-4 py-3 text-sm font-black ${
                  message.type === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {message.text}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSavePin}
                className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
              >
                {m.save}
              </button>
              {pinEnabled && (
                <button
                  type="button"
                  onClick={handleResetPin}
                  className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
                >
                  {m.resetPin}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-red-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            data-settings-close="true"
            className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
          >
            {m.close}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveEventSettings()}
            disabled={saving}
            data-settings-save="true"
            className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {m.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function PinPromptModal({
  m,
  onSubmit,
  onCancel,
}: {
  m: Messages;
  onSubmit: (pin: string) => boolean;
  onCancel: () => void;
}) {
  const [pin, setPromptPin] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!onSubmit(pin)) {
      setError(m.wrongPin);
      setPromptPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-3xl border border-red-100 bg-[#fffdfa] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-prompt-title"
      >
        <h2 id="pin-prompt-title" className="text-3xl font-black text-stone-950">
          {m.enterPin}
        </h2>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(event) => setPromptPin(event.target.value.replace(/\D/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          className="mt-5 h-16 w-full rounded-2xl border-2 border-red-200 bg-white px-5 text-center text-3xl font-black tracking-[0.35em] text-stone-950 focus:border-red-600 focus:outline-none"
        />
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
          >
            {m.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
          >
            {m.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function QueueModal({
  event,
  m,
  onServe,
  onClose,
}: {
  event: BarEvent;
  m: Messages;
  onServe: (buttonId: string, amount: number) => void;
  onClose: () => void;
}) {
  const queuedDrinks = getPendingQueue(event).drinks;
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const getAmountValue = (buttonId: string) => amounts[buttonId] ?? "1";

  const getServeAmount = (button: DrinkButton) => {
    const value = Number(getAmountValue(button.id));
    if (!Number.isFinite(value)) return null;

    const wholeAmount = Math.floor(value);
    if (wholeAmount <= 0) return null;

    return Math.min(button.pendingCount, wholeAmount);
  };

  const stepAmount = (button: DrinkButton, direction: -1 | 1) => {
    setAmounts((current) => {
      const value = Number(current[button.id] ?? "1");
      const currentAmount = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
      const nextAmount = Math.min(button.pendingCount, Math.max(1, currentAmount + direction));
      return { ...current, [button.id]: String(nextAmount) };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-red-100 bg-[#fffdfa] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-title"
      >
        <div className="overflow-y-auto p-6">
          <h2 id="queue-title" className="text-4xl font-black tracking-tight text-stone-950">
            {m.queue}
          </h2>
          {queuedDrinks.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-stone-200 bg-white px-4 py-8 text-center text-lg font-bold text-stone-400">
              {m.queueEmpty}
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {queuedDrinks.map((button) => {
                const amountToServe = getServeAmount(button);

                return (
                  <li
                    key={button.id}
                    className="rounded-2xl border border-red-100 bg-white/90 p-4 shadow-[0_4px_16px_rgba(120,53,15,0.08)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-2xl font-black text-stone-950">{button.name}</p>
                        <p className="text-sm font-black uppercase tracking-wide text-stone-500">
                          {m.queueCount}
                        </p>
                      </div>
                      <span className="rounded-full bg-red-700 px-4 py-2 text-2xl font-black leading-none text-white shadow-[0_4px_10px_rgba(185,28,28,0.26)]">
                        {button.pendingCount}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-[0.75fr_0.75fr_2.3fr]">
                      <button
                        type="button"
                        onClick={() => onServe(button.id, 1)}
                        className="min-h-12 rounded-2xl border-2 border-stone-300 bg-white px-4 py-2 font-black text-stone-800 active:bg-stone-100"
                      >
                        {m.serveOne}
                      </button>
                      <button
                        type="button"
                        onClick={() => onServe(button.id, button.pendingCount)}
                        className="min-h-12 rounded-2xl bg-red-700 px-4 py-2 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.20)] active:bg-red-800"
                      >
                        {m.serveAll}
                      </button>
                      <div className="grid gap-2 sm:grid-cols-[minmax(8.75rem,1fr)_minmax(10.5rem,auto)]">
                        <div className="grid min-w-0 flex-1 grid-cols-[2.75rem_minmax(3.25rem,1fr)_2.75rem] rounded-2xl border-2 border-stone-200 bg-white">
                          <button
                            type="button"
                            onClick={() => stepAmount(button, -1)}
                            className="min-h-12 rounded-l-2xl text-2xl font-black text-stone-700 active:bg-stone-100"
                            aria-label="-1"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            step={1}
                            min={1}
                            max={button.pendingCount}
                            value={getAmountValue(button.id)}
                            onChange={(event) =>
                              setAmounts((current) => ({
                                ...current,
                                [button.id]: event.target.value,
                              }))
                            }
                            className="min-h-12 min-w-0 border-x-2 border-stone-100 bg-white px-2 text-center text-lg font-black text-stone-950 focus:outline-none"
                            aria-label={m.serveAmount}
                          />
                          <button
                            type="button"
                            onClick={() => stepAmount(button, 1)}
                            className="min-h-12 rounded-r-2xl text-2xl font-black text-stone-700 active:bg-stone-100"
                            aria-label="+1"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={amountToServe === null}
                          onClick={() => {
                            if (amountToServe !== null) onServe(button.id, amountToServe);
                          }}
                          className="min-h-12 rounded-2xl border-2 border-red-200 bg-white px-4 py-2 font-black text-red-700 active:bg-red-50 disabled:border-stone-200 disabled:text-stone-300 disabled:shadow-none disabled:active:bg-white"
                        >
                          {m.serveAmount}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-red-100 bg-white/80 p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 w-full rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
          >
            {m.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteEventConfirmModal({
  event,
  m,
  onConfirm,
  onCancel,
}: {
  event: BarEvent;
  m: Messages;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-3xl border border-red-100 bg-[#fffdfa] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-event-title"
      >
        <h2 id="delete-event-title" className="text-3xl font-black text-stone-950">
          {m.deleteEventQuestion}
        </h2>
        <p className="mt-3 text-xl font-black text-stone-950">{event.name}</p>
        <p className="mt-2 text-base font-semibold leading-snug text-stone-600">
          {m.deleteEventWarning}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
          >
            {m.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
          >
            {m.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BarCounterApp() {
  const [locale, setLocaleState] = useState<Locale>("ru");
  const [screen, setScreen] = useState<Screen>("home");
  const [events, setEvents] = useState<BarEvent[]>([]);
  const [activeEvent, setActiveEventState] = useState<BarEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [createSelectedTemplateIds, setCreateSelectedTemplateIds] = useState<string[]>([]);
  const [newEventQueueDefault, setNewEventQueueDefaultState] = useState(true);
  const [newEventCategoriesDefault, setNewEventCategoriesDefaultState] =
    useState(false);
  const [undoMode, setUndoMode] = useState(false);
  const [serveMode, setServeMode] = useState(false);
  const [eventMessage, setEventMessage] = useState<EventMessage | null>(null);
  const [selectedEventCategory, setSelectedEventCategory] = useState<DrinkCategory>("cocktail");
  const [editingButton, setEditingButton] = useState<DrinkButton | null>(null);
  const [addingButton, setAddingButton] = useState<DrinkButton | null>(null);
  const [customTemplates, setCustomTemplates] = useState<DrinkTemplate[]>([]);
  const [resultsEvent, setResultsEvent] = useState<BarEvent | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BarEvent | null>(null);
  const [pinEnabled, setPinEnabledState] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] =
    useState<(() => void | Promise<void>) | null>(null);
  const [buttonCountPresetState, setButtonCountPresetState] =
    useState<ButtonCountPreset>(16);

  const m = t(locale);
  const drinkTemplates = useMemo(
    () => [...DRINK_TEMPLATES, ...customTemplates],
    [customTemplates],
  );

  const refresh = useCallback(async () => {
    const all = await listEvents();
    setEvents(all);
    const active = await getActiveEvent();
    if (active) {
      setActiveEventState(active);
      return;
    }
    const lastId = getLastActiveEventId();
    if (lastId) {
      const last = await getEvent(lastId);
      setActiveEventState(last ?? null);
    } else {
      setActiveEventState(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setLocaleState(getLocale());
    setButtonCountPresetState(getButtonCountPreset());
    setNewEventQueueDefaultState(getNewEventQueueDefault());
    setNewEventCategoriesDefaultState(getNewEventCategoriesDefault());
    setPinEnabledState(hasPin());
    setCustomTemplates(getCustomDrinkTemplates());
  }, []);

  useEffect(() => {
    const allowed = new Set(drinkTemplates.map((template) => template.id));
    const filtered = createSelectedTemplateIds.filter((id) => allowed.has(id));
    if (filtered.length !== createSelectedTemplateIds.length) {
      setCreateSelectedTemplateIds(filtered);
    }
  }, [createSelectedTemplateIds, drinkTemplates]);

  useEffect(() => {
    if (activeEvent?.queueEnabled === false) {
      setServeMode(false);
      setQueueOpen(false);
    }
  }, [activeEvent?.queueEnabled]);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    setLocaleState(next);
  };

  const setNewEventQueueDefault = (enabled: boolean) => {
    setNewEventQueueDefaultState(enabled);
    setNewEventQueueDefaultPref(enabled);
  };

  const setNewEventCategoriesDefault = (enabled: boolean) => {
    setNewEventCategoriesDefaultState(enabled);
    setNewEventCategoriesDefaultPref(enabled);
  };

  const applyEventSettings = async (
    queueEnabled: boolean,
    categoriesEnabled: boolean,
  ) => {
    setNewEventQueueDefault(queueEnabled);
    setNewEventCategoriesDefault(categoriesEnabled);
    if (!activeEvent) return;
    const updated = await saveEvent({
      ...activeEvent,
      queueEnabled,
      categoriesEnabled,
    });
    setActiveEventState(updated);
    await refresh();
  };

  const requestProtectedAction = (action: () => void | Promise<void>) => {
    if (!pinEnabled) {
      void action();
      return;
    }
    setPendingProtectedAction(() => action);
  };

  const submitProtectedPin = (pin: string) => {
    if (!verifyPin(pin)) return false;
    const action = pendingProtectedAction;
    setPendingProtectedAction(null);
    void action?.();
    return true;
  };

  const handleCreate = async () => {
    const selectedTemplates = drinkTemplates.filter((template) =>
      createSelectedTemplateIds.includes(template.id),
    );
    if (selectedTemplates.length === 0) return;
    const event = await createEventWithOptions({
      name: eventName,
      locale,
      selectedTemplates,
      queueEnabled: newEventQueueDefault,
      categoriesEnabled: newEventCategoriesDefault,
    });
    setActiveEventState(event);
    setEventName("");
    setCreateSelectedTemplateIds([]);
    setSelectedEventCategory(firstCategoryWithButtons(event.buttons));
    setScreen("event");
    await refresh();
  };

  const handleContinue = async () => {
    if (!activeEvent) return;
    if (!activeEvent.isActive) {
      const resumed = await setActiveEvent(activeEvent.id);
      setActiveEventState(resumed ?? activeEvent);
    }
    setScreen("event");
    await refresh();
  };

  const applyEventUpdate = async (updated: BarEvent) => {
    setActiveEventState(updated);
    await refresh();
    if (resultsEvent?.id === updated.id) setResultsEvent(updated);
    if (getPendingQueue(updated).total === 0) setEventMessage(null);
  };

  const handleTap = async (buttonId: string) => {
    if (!activeEvent) return;
    if (undoMode) {
      const updated = await undoDrink(activeEvent, buttonId);
      setUndoMode(false);
      await applyEventUpdate(updated);
      return;
    }
    if (serveMode) {
      const updated = await serveDrink(activeEvent, buttonId, 1);
      await applyEventUpdate(updated);
      return;
    }
    const updated = await orderDrinkWithQueueMode(
      activeEvent,
      buttonId,
      activeEvent.queueEnabled !== false,
    );
    await applyEventUpdate(updated);
  };

  const handleServe = async (buttonId: string, amount: number) => {
    if (!activeEvent) return;
    if (activeEvent.queueEnabled === false) return;
    const updated = await serveDrink(activeEvent, buttonId, amount);
    await applyEventUpdate(updated);
    if (getPendingQueue(updated).total === 0) setQueueOpen(false);
  };

  const openResults = async (event: BarEvent) => {
    const fresh = await getEvent(event.id);
    setResultsEvent(fresh ?? event);
  };

  const handleExport = async (event: BarEvent) => {
    const fresh = (await getEvent(event.id)) ?? event;
    const logs = await getTapLogsForEvent(fresh.id);
    const csv = buildEventCsv(fresh, logs, locale);
    downloadCsv(eventCsvFilename(fresh), csv);
  };

  const handleCloseEvent = async () => {
    await closeActiveEvent();
    setUndoMode(false);
    setServeMode(false);
    setEventMessage(null);
    setScreen("home");
    await refresh();
  };

  const requestFinishEvent = () => {
    if (!activeEvent) return;
    if (activeEvent.queueEnabled !== false && getPendingQueue(activeEvent).total > 0) {
      setEventMessage("finishBlockedByQueue");
      return;
    }
    requestProtectedAction(() => handleCloseEvent());
  };

  const performDeleteEvent = async (event: BarEvent) => {
    await deleteEvent(event.id);
    if (activeEvent?.id === event.id) {
      setActiveEventState(null);
      setUndoMode(false);
      setServeMode(false);
      setEventMessage(null);
      setScreen("home");
    }
    if (resultsEvent?.id === event.id) setResultsEvent(null);
    await refresh();
  };

  const confirmDeleteEvent = () => {
    if (!deleteCandidate) return;
    const event = deleteCandidate;
    setDeleteCandidate(null);
    requestProtectedAction(() => performDeleteEvent(event));
  };

  const withOptionalCustomTemplate = (
    patch: Partial<DrinkButton>,
    saveAsTemplate?: boolean,
  ): Partial<DrinkButton> => {
    if (!saveAsTemplate) return patch;
    const name = (patch.name ?? "").trim();
    if (!name || !patch.category || !patch.icon || !patch.color) return patch;
    const template: DrinkTemplate = {
      id: newCustomTemplateId(),
      category: patch.category,
      icon: patch.icon,
      color: patch.color,
      labels: { ru: name, de: name },
    };
    const nextTemplates = saveCustomDrinkTemplate(template);
    setCustomTemplates(nextTemplates);
    const savedTemplate = nextTemplates.at(-1);
    return { ...patch, templateId: savedTemplate?.id ?? template.id };
  };

  const handleSaveEdit = async (
    patch: Partial<DrinkButton>,
    options?: { saveAsTemplate: boolean },
  ) => {
    if (!activeEvent || !editingButton) return;
    const updated = await updateButton(
      activeEvent,
      editingButton.id,
      withOptionalCustomTemplate(patch, options?.saveAsTemplate),
    );
    setActiveEventState(updated);
    setEditingButton(null);
    await refresh();
    if (resultsEvent?.id === updated.id) setResultsEvent(updated);
  };

  const handleSaveAdd = async (
    patch: Partial<DrinkButton>,
    options?: { saveAsTemplate: boolean },
  ) => {
    if (!activeEvent || !addingButton) return;
    const patched = withOptionalCustomTemplate(
      { ...patch, count: 0, pendingCount: 0, isVisible: true },
      options?.saveAsTemplate,
    );
    const buttonExists = activeEvent.buttons.some((button) => button.id === addingButton.id);
    const updated = buttonExists
      ? await updateButton(activeEvent, addingButton.id, patched)
      : await saveEvent({
          ...activeEvent,
          buttons: [
            ...activeEvent.buttons,
            {
              ...addingButton,
              ...patched,
              id: addingButton.id,
              slotIndex: addingButton.slotIndex,
              name: (patched.name ?? addingButton.name).trim() || addingButton.name,
              category: patched.category ?? addingButton.category,
              icon: patched.icon ?? addingButton.icon,
              color: patched.color ?? addingButton.color,
              count: 0,
              pendingCount: 0,
              isVisible: true,
            },
          ],
        });
    const sortedUpdatedButtons = [...updated.buttons].sort((a, b) => a.slotIndex - b.slotIndex);
    const visibleRank = rankVisibleSlot(sortedUpdatedButtons, addingButton.id);
    if (visibleRank >= buttonCountPresetState) {
      const nextPreset = normalizeButtonCountPreset(visibleRank + 1);
      setButtonCountPreset(nextPreset);
      setButtonCountPresetState(nextPreset);
    }
    setActiveEventState(updated);
    setAddingButton(null);
    await refresh();
    if (resultsEvent?.id === updated.id) setResultsEvent(updated);
  };

  const handleHideButton = async (button: DrinkButton) => {
    if (!activeEvent) return;
    if (button.count > 0 || button.pendingCount > 0) return;
    const updated = await updateButton(activeEvent, button.id, { isVisible: false });
    setActiveEventState(updated);
    setEditingButton(null);
    await refresh();
    if (resultsEvent?.id === updated.id) setResultsEvent(updated);
  };

  const handleApplyButtonTemplate = (preset: ButtonCountPreset) => {
    const normalizedPreset = normalizeButtonCountPreset(preset);
    setButtonCountPreset(normalizedPreset);
    setButtonCountPresetState(normalizedPreset);
    setTemplateOpen(false);
  };

  const handleToggleCreateTemplate = (templateId: string) => {
    setCreateSelectedTemplateIds((current) => {
      if (current.includes(templateId)) {
        return current.filter((id) => id !== templateId);
      }
      if (current.length >= MAX_BUTTON_COUNT) return current;
      return [...current, templateId];
    });
  };

  const totalCount = activeEvent?.buttons.reduce((s, b) => s + b.count, 0) ?? 0;
  const pendingQueue = activeEvent ? getPendingQueue(activeEvent) : null;
  const pendingQueueTotal = pendingQueue?.total ?? 0;
  const queueEnabled = activeEvent?.queueEnabled !== false;
  const categoriesEnabled = activeEvent?.categoriesEnabled === true;
  const heroEvent = screen === "event" ? activeEvent : null;
  const sortedButtons = activeEvent
    ? [...activeEvent.buttons].sort((a, b) => a.slotIndex - b.slotIndex)
    : [];
  const createGroups = groupTemplatesByCategory(drinkTemplates);
  const selectedProductsCount = createSelectedTemplateIds.length;
  // Per-button visibility controls the active grid. The preset is only a layout
  // preference/default and must not hide products already selected for an event.
  // Hidden slots stay in event.buttons, so non-zero hidden counts remain in
  // totals, queue, results, CSV export, and future presets.
  const activeEventVisibleButtons = sortedButtons.filter(
    (button) => button.isVisible !== false,
  );
  const categoryCounts = CATEGORY_ORDER.reduce<Record<DrinkCategory, number>>(
    (acc, category) => {
      acc[category] = activeEventVisibleButtons.filter(
        (button) => button.category === category,
      ).length;
      return acc;
    },
    {
      cocktail: 0,
      mocktail: 0,
      beer: 0,
      wine: 0,
      soft: 0,
      warm: 0,
      other: 0,
    },
  );
  const categoryPendingCounts = CATEGORY_ORDER.reduce<Record<DrinkCategory, number>>(
    (acc, category) => {
      acc[category] = queueEnabled
        ? activeEventVisibleButtons
            .filter((button) => button.category === category)
            .reduce((sum, button) => sum + button.pendingCount, 0)
        : 0;
      return acc;
    },
    {
      cocktail: 0,
      mocktail: 0,
      beer: 0,
      wine: 0,
      soft: 0,
      warm: 0,
      other: 0,
    },
  );
  const activeCategories = categoriesEnabled
    ? CATEGORY_ORDER.filter((category) => categoryCounts[category] > 0)
    : [];
  const activeCategoriesKey = activeCategories.join("|");
  const firstActiveCategory = activeCategories[0];
  const effectiveSelectedCategory = activeCategories.includes(selectedEventCategory)
    ? selectedEventCategory
    : (activeCategories[0] ?? "cocktail");
  const categoryFilteredButtons = categoriesEnabled
    ? activeEventVisibleButtons
        .filter((button) => button.category === effectiveSelectedCategory)
    : activeEventVisibleButtons;
  const visibleButtons = categoryFilteredButtons;
  const addButtonSlot = findAddButtonSlot(sortedButtons, buttonCountPresetState);
  const canAddProduct = Boolean(addButtonSlot) || sortedButtons.length < MAX_BUTTON_COUNT;
  const showAddButton = canAddProduct && visibleButtons.length < MAX_BUTTON_COUNT;
  const gridItemCount = visibleButtons.length + (showAddButton ? 1 : 0);
  const gridLayout = getProductGridLayout(Math.max(1, gridItemCount));
  const productGridStyle: ProductGridStyle = {
    "--rbbc-grid-cols": gridLayout.columns,
    "--rbbc-grid-rows": gridLayout.rows,
    "--rbbc-grid-mobile-cols": gridLayout.mobileColumns,
    "--rbbc-grid-mobile-rows": gridLayout.mobileRows,
  };
  const goCurrentEvent = () => {
    if (!activeEvent) return;
    void handleContinue();
  };
  const goHistory = () => setScreen("history");
  const openTemplate = () => setTemplateOpen(true);
  const openQueue = () => {
    if (!queueEnabled) return;
    setQueueOpen(true);
  };
  const openSettings = () => setSettingsOpen(true);
  const openAddProduct = () => {
    if (!canAddProduct) return;
    const category = categoriesEnabled ? effectiveSelectedCategory : "other";
    const defaults = CATEGORY_DEFAULTS[category];
    const sourceSlot = addButtonSlot;
    setAddingButton({
      id: sourceSlot?.id ?? newButtonId(),
      slotIndex: sourceSlot?.slotIndex ?? nextSlotIndex(sortedButtons),
      name: m.addProduct,
      templateId: undefined,
      category,
      icon: defaults.icon,
      color: defaults.color,
      isVisible: true,
      count: 0,
      pendingCount: 0,
    });
  };
  const openActiveResults = () => {
    if (!activeEvent) return;
    void openResults(activeEvent);
  };
  const toggleUndoMode = () => {
    setServeMode(false);
    setUndoMode((current) => !current);
  };
  const toggleServeMode = () => {
    if (!queueEnabled) return;
    setUndoMode(false);
    setServeMode((current) => !current);
  };

  useEffect(() => {
    if (!categoriesEnabled || !firstActiveCategory) return;
    if (!activeCategoriesKey.split("|").includes(selectedEventCategory)) {
      setSelectedEventCategory(firstActiveCategory);
    }
  }, [
    categoriesEnabled,
    activeCategoriesKey,
    firstActiveCategory,
    selectedEventCategory,
  ]);

  return (
    <main className="rbbc-app-shell flex flex-col overflow-hidden bg-[#FAF8F4] text-stone-950">
      <header className="grid shrink-0 grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto] items-center gap-2 border-b border-red-100/80 bg-[#fffdfa]/95 px-3 py-2 shadow-[0_4px_18px_rgba(120,53,15,0.08)] sm:gap-3 sm:px-4 lg:px-5">
        <button
          type="button"
          onClick={() => setScreen("home")}
          className="justify-self-start focus:outline-none"
          aria-label="Rolling Badger Bar — Home"
        >
          <RollingBadgerLogo />
        </button>
        <EventHero event={heroEvent} totalCount={totalCount} m={m} />
        <LanguageSwitcher locale={locale} onChange={changeLocale} />
      </header>

      {screen === "home" && (
        <section className="flex flex-1 overflow-auto px-5 py-8 md:items-center md:justify-center">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-red-100 bg-white/85 p-5 shadow-[0_6px_22px_rgba(120,53,15,0.10)] md:p-7">
            <h2 className="text-4xl font-black tracking-tight text-stone-950">
              {m.appTitle}
            </h2>

            {activeEvent?.isActive && (
              <button
                type="button"
                onClick={() => void handleContinue()}
                className="min-h-20 rounded-2xl bg-red-700 px-6 py-4 text-left text-xl font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
              >
                <span className="block text-sm font-semibold uppercase tracking-wide opacity-80">
                  {m.continueEvent}
                </span>
                {activeEvent.name}
              </button>
            )}
            {activeEvent && !activeEvent.isActive && (
              <button
                type="button"
                onClick={() => void handleContinue()}
                className="min-h-20 rounded-2xl border-2 border-stone-300 bg-white px-6 py-4 text-left text-xl font-black text-stone-800 shadow-sm active:bg-stone-100"
              >
                <span className="block text-sm font-semibold uppercase tracking-wide text-stone-400">
                  {m.continueEvent}
                </span>
                {activeEvent.name}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEventName("");
                setCreateSelectedTemplateIds([]);
                setScreen("create");
              }}
              className="min-h-16 rounded-2xl bg-red-700 px-6 py-4 text-lg font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
            >
              {m.createEvent}
            </button>
            <button
              type="button"
              onClick={() => setScreen("history")}
              className="min-h-16 rounded-2xl border-2 border-stone-300 bg-white px-6 py-4 text-lg font-black text-stone-800 shadow-sm active:bg-stone-100"
            >
              {m.history}
            </button>
          </div>
        </section>
      )}

      {screen === "create" && (
        <section className="flex flex-1 overflow-auto px-5 py-6 md:justify-center">
          <div className="w-full max-w-5xl rounded-3xl border border-red-100 bg-white/85 p-5 shadow-[0_6px_22px_rgba(120,53,15,0.10)] md:p-7">
            <h2 className="mb-6 text-3xl font-black text-stone-950">{m.createEvent}</h2>
            <label className="mb-2 block text-sm font-black uppercase tracking-wide text-stone-500">
              {m.eventName}
            </label>
            <input
              className="mb-4 w-full rounded-2xl border-2 border-stone-200 bg-white px-5 py-4 text-2xl font-black text-stone-950 shadow-sm placeholder:text-stone-300 focus:border-red-500 focus:outline-none"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder={locale === "de" ? "Freitag Bar" : "Пятничный бар"}
            />
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-wide text-stone-500">
                {m.menuSetupTitle}
              </p>
              <p className="text-sm font-black text-stone-700">
                {m.selectedProducts}: {selectedProductsCount}/{MAX_BUTTON_COUNT}
              </p>
            </div>
            <div className="mb-6 space-y-4 rounded-2xl border border-stone-200 bg-white/70 p-4">
              {createGroups.map((group) => (
                <div key={group.category} className="rounded-2xl border border-stone-200/80 bg-white/80 p-3">
                  <h3 className="mb-2 text-base font-black text-stone-900">
                    {m.categories[group.category]}
                  </h3>
                  {group.items.length === 0 ? (
                    <p className="text-sm font-semibold text-stone-400">
                      {m.noProductsInCategory}
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((template) => {
                        const checked = createSelectedTemplateIds.includes(template.id);
                        const disabled = !checked && selectedProductsCount >= MAX_BUTTON_COUNT;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleToggleCreateTemplate(template.id)}
                            disabled={disabled}
                            className={`min-h-12 rounded-xl border-2 px-3 py-2 text-left text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              checked
                                ? "border-red-700 bg-red-50 text-red-800"
                                : "border-stone-300 bg-white text-stone-700 active:bg-stone-100"
                            }`}
                          >
                            <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded border border-current text-[0.7rem] leading-none">
                              {checked ? "✓" : ""}
                            </span>
                            {template.labels[locale]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {selectedProductsCount === 0 && (
              <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">
                {m.selectAtLeastOneProduct}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScreen("home")}
                className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
              >
                {m.back}
              </button>
              <button
                type="button"
                disabled={selectedProductsCount === 0}
                onClick={() => void handleCreate()}
                className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {m.startEvent}
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "history" && (
        <section className="flex-1 overflow-auto px-5 py-5 md:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScreen("home")}
                className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-stone-300 bg-white px-4 py-2 text-base font-black text-stone-700 active:bg-stone-100"
              >
                <BackArrowIcon />
                {m.back}
              </button>
              <h2 className="text-3xl font-black text-stone-950">{m.history}</h2>
            </div>
            {events.length === 0 ? (
              <p className="rounded-2xl border border-red-100 bg-white/85 px-5 py-8 text-center text-lg font-bold text-stone-500">
                {m.noEvents}
              </p>
            ) : (
              <ul className="space-y-3">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-100 bg-white/90 p-5 shadow-[0_4px_16px_rgba(120,53,15,0.08)]"
                  >
                    <div>
                      <p className="text-2xl font-black text-stone-950">{event.name}</p>
                      <p className="mt-1 text-base font-medium text-stone-500">
                        {new Date(event.createdAt).toLocaleString(
                          locale === "de" ? "de-DE" : "ru-RU",
                        )}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-lg px-3 py-1 text-xs font-black uppercase ${
                          event.isActive
                            ? "bg-red-700 text-white"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {event.isActive ? m.active : m.closed}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="min-h-12 rounded-2xl border-2 border-stone-300 bg-white px-5 py-2 text-base font-black text-stone-700 active:bg-stone-100"
                        onClick={async () => {
                          const target =
                            event.isActive
                              ? event
                              : (await setActiveEvent(event.id)) ?? event;
                          setActiveEventState(target);
                          setScreen("event");
                        }}
                      >
                        {m.continueEvent}
                      </button>
                      <button
                        type="button"
                        className="min-h-12 rounded-2xl border-2 border-stone-300 bg-white px-5 py-2 text-base font-black text-stone-700 active:bg-stone-100"
                        onClick={() => void openResults(event)}
                      >
                        {m.results}
                      </button>
                      <button
                        type="button"
                        className="min-h-12 rounded-2xl bg-red-700 px-5 py-2 text-base font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.20)] active:bg-red-800"
                        onClick={() => void handleExport(event)}
                      >
                        {m.exportCsv}
                      </button>
                      <button
                        type="button"
                        className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-red-200 bg-white px-5 py-2 text-base font-black text-red-700 active:bg-red-50"
                        onClick={() => setDeleteCandidate(event)}
                      >
                        <TrashIcon />
                        {m.delete}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {screen === "event" && activeEvent && (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="rbbc-phone-portrait-only min-h-0 flex-1 items-center justify-center px-6 text-center">
            <p className="rounded-3xl border border-red-100 bg-white/90 px-5 py-8 text-2xl font-black leading-tight text-stone-950 shadow-[0_6px_22px_rgba(120,53,15,0.10)]">
              {m.rotateDevice}
            </p>
          </div>

          <div className="rbbc-event-operating-surface flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-red-100/80 bg-[#fffdfa]/90 px-3 py-2 sm:px-4 lg:px-5">
              <div className="grid w-full grid-cols-[minmax(5.8rem,0.8fr)_minmax(11rem,1.9fr)_minmax(11rem,1.9fr)_minmax(5.8rem,0.8fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] items-stretch gap-2">
                <IconButton
                  icon={<UndoIcon />}
                  variant={undoMode ? "solid" : "outline"}
                  onClick={toggleUndoMode}
                >
                  {m.undo}
                </IconButton>
                <IconButton
                  icon={<QueueIcon />}
                  variant="outline"
                  emphasis="featured"
                  disabled={!queueEnabled}
                  className={
                    queueEnabled
                      ? "border-red-300 bg-red-50/80 text-red-800"
                      : "border-stone-300 bg-stone-100 text-stone-400"
                  }
                  onClick={openQueue}
                >
                  {m.queue}
                  {queueEnabled && pendingQueueTotal > 0 ? ` ${pendingQueueTotal}` : ""}
                </IconButton>
                <IconButton
                  icon={<QueueIcon />}
                  variant={serveMode ? "solid" : "outline"}
                  emphasis="featured"
                  disabled={!queueEnabled}
                  className={
                    !queueEnabled
                      ? "border-stone-300 bg-stone-100 text-stone-400"
                      : serveMode
                      ? "ring-4 ring-red-200 ring-offset-1"
                      : "border-red-300 bg-white text-red-800"
                  }
                  onClick={toggleServeMode}
                >
                  {serveMode ? m.serveMode : m.serve}
                </IconButton>
                <IconButton
                  icon={<BarChartIcon />}
                  variant="outline"
                  onClick={() => void openResults(activeEvent)}
                >
                  {m.results}
                </IconButton>
                {activeEvent.isActive && (
                  <IconButton
                    icon={<StopSquareIcon />}
                    variant="danger"
                    onClick={requestFinishEvent}
                  >
                    {m.closeEvent}
                  </IconButton>
                )}
                <IconButton
                  icon={<DownloadIcon />}
                  variant="solid"
                  onClick={() => void handleExport(activeEvent)}
                >
                  {m.exportCsv}
                </IconButton>
              </div>
              {eventMessage && (
                <p className="w-full rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-black text-red-700 sm:text-sm">
                  {m[eventMessage]}
                </p>
              )}
              {!queueEnabled && (
                <p className="w-full rounded-xl bg-stone-100 px-3 py-2 text-center text-xs font-black text-stone-500 sm:text-sm">
                  {m.queueDisabledHint}
                </p>
              )}
            </div>

            <div className="flex min-h-0 flex-1 gap-3 overflow-hidden px-3 py-2 sm:px-4 lg:px-5">
              <div className="min-w-0 flex-1 overflow-hidden">
                <div
                  className="rbbc-product-grid h-full min-h-0"
                  style={productGridStyle}
                  data-product-count={visibleButtons.length}
                >
                  {visibleButtons.map((button) => (
                    <DrinkGridButton
                      key={button.id}
                      button={button}
                      undoMode={undoMode}
                      serveMode={serveMode}
                      cardScale={gridLayout.cardScale}
                      onTap={(id) => void handleTap(id)}
                      onLongPress={setEditingButton}
                    />
                  ))}
                  {showAddButton && (
                    <AddProductButton
                      cardScale={gridLayout.cardScale}
                      label={m.addProduct}
                      hint={m.addProductHint}
                      onTap={openAddProduct}
                      onLongPress={openAddProduct}
                    />
                  )}
                </div>
                {categoriesEnabled && visibleButtons.length === 0 && (
                  <div className="mt-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-6 text-center text-sm font-bold text-stone-400">
                    {m.noProductsInCategory}
                  </div>
                )}
              </div>
              {categoriesEnabled ? (
                <CategorySideMenu
                  categories={activeCategories}
                  pendingCounts={categoryPendingCounts}
                  selectedCategory={effectiveSelectedCategory}
                  onSelect={setSelectedEventCategory}
                  m={m}
                />
              ) : (
                <SidePanel
                  activeEvent={activeEvent}
                  totalCount={totalCount}
                  queueEnabled={queueEnabled}
                  m={m}
                  openResults={openActiveResults}
                  openQueue={openQueue}
                  goHistory={goHistory}
                  openTemplate={openTemplate}
                  openSettings={openSettings}
                />
              )}
            </div>
          </div>
        </section>
      )}

      <BottomNav
        screen={screen}
        activeEvent={activeEvent}
        m={m}
        goEvent={goCurrentEvent}
        goHistory={goHistory}
        openTemplate={openTemplate}
        openSettings={openSettings}
      />

      <EditButtonModal
        locale={locale}
        button={editingButton}
        open={Boolean(editingButton)}
        mode="edit"
        templates={drinkTemplates}
        onClose={() => setEditingButton(null)}
        onSave={(patch, options) => void handleSaveEdit(patch, options)}
        onHide={(button) => void handleHideButton(button)}
      />

      <EditButtonModal
        locale={locale}
        button={addingButton}
        open={Boolean(addingButton)}
        mode="add"
        templates={drinkTemplates}
        onClose={() => setAddingButton(null)}
        onSave={(patch, options) => void handleSaveAdd(patch, options)}
      />

      {templateOpen && (
        <ButtonTemplateModal
          locale={locale}
          m={m}
          currentPreset={buttonCountPresetState}
          onApply={handleApplyButtonTemplate}
          onClose={() => setTemplateOpen(false)}
        />
      )}

      {queueOpen && activeEvent && queueEnabled && (
        <QueueModal
          event={activeEvent}
          m={m}
          onServe={(buttonId, amount) => void handleServe(buttonId, amount)}
          onClose={() => setQueueOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          locale={locale}
          m={m}
          activeEvent={activeEvent}
          pinEnabled={pinEnabled}
          initialQueueEnabled={activeEvent?.queueEnabled ?? newEventQueueDefault}
          initialCategoriesEnabled={
            activeEvent?.categoriesEnabled ?? newEventCategoriesDefault
          }
          onLocaleChange={changeLocale}
          onApplyEventSettings={applyEventSettings}
          onPinEnabledChange={setPinEnabledState}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {deleteCandidate && (
        <DeleteEventConfirmModal
          event={deleteCandidate}
          m={m}
          onConfirm={confirmDeleteEvent}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}

      {pendingProtectedAction && (
        <PinPromptModal
          m={m}
          onSubmit={submitProtectedPin}
          onCancel={() => setPendingProtectedAction(null)}
        />
      )}

      {resultsEvent && (
        <EventResultsView
          event={resultsEvent}
          locale={locale}
          onClose={() => setResultsEvent(null)}
          onExport={() => void handleExport(resultsEvent)}
        />
      )}
    </main>
  );
}
