"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DrinkGridButton, type DrinkCardScale } from "@/components/DrinkGridButton";
import { EditButtonModal } from "@/components/EditButtonModal";
import { EventResultsView } from "@/components/EventResultsView";
import { buildEventCsv, downloadCsv, eventCsvFilename } from "@/lib/csv/export";
import { formatEventDateTime } from "@/lib/events/results";
import { t } from "@/lib/i18n/messages";
import {
  NavCurrentIcon,
  NavHistoryIcon,
  NavSettingsIcon,
  NavTemplateIcon,
} from "@/lib/ui/icons";
import {
  applyTap,
  closeActiveEvent,
  createEvent,
  getActiveEvent,
  getEvent,
  getTapLogsForEvent,
  listEvents,
  setActiveEvent,
  updateButton,
} from "@/lib/storage/events";
import {
  clearPin,
  getButtonCountPreset,
  getLastActiveEventId,
  getLocale,
  hasPin,
  isValidPin,
  normalizeButtonCountPreset,
  setButtonCountPreset,
  setLocale,
  setPin,
  verifyPin,
} from "@/lib/storage/preferences";
import type { BarEvent, ButtonCountPreset, DrinkButton, Locale } from "@/lib/types";

type Screen = "home" | "create" | "event" | "history";
type Messages = ReturnType<typeof t>;
type ProductGridStyle = CSSProperties & {
  "--rbbc-grid-cols": number;
  "--rbbc-grid-rows": number;
  "--rbbc-grid-mobile-cols": number;
  "--rbbc-grid-mobile-rows": number;
};

const BUTTON_COUNT_PRESETS: readonly ButtonCountPreset[] = [4, 5, 6, 7, 8, 12, 16];
const MIN_BUTTON_COUNT = 1;
const MAX_BUTTON_COUNT = 16;

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

function RollingBadgerLogo() {
  return (
    <div
      className="flex min-w-36 select-none items-center gap-3 leading-none"
      aria-label="Rolling Badger Bar"
    >
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.22)]">
        <span className="absolute top-3 h-7 w-4 rotate-[-18deg] rounded-full bg-white" />
        <span className="absolute top-3 h-7 w-4 rotate-[18deg] rounded-full bg-white" />
        <span className="relative mt-2 h-8 w-7 rounded-b-2xl rounded-t-lg bg-stone-950" />
      </span>
      <span className="flex flex-col items-start">
        <span className="text-xl font-black tracking-tight text-stone-950">Rolling</span>
        <span className="-mt-1 text-2xl font-black tracking-tight text-red-700">
          Badger
        </span>
        <span className="-mt-1 text-xl font-black tracking-tight text-stone-950">Bar</span>
      </span>
    </div>
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

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M5 1.5V4.5M11 1.5V4.5M2 7h12" />
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
  locale,
  m,
}: {
  event: BarEvent | null;
  totalCount: number;
  locale: Locale;
  m: Messages;
}) {
  if (!event) {
    return (
      <div className="min-w-0 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
          Rolling Badger
        </p>
        <h1 className="text-3xl font-black tracking-tight text-stone-950 md:text-4xl">
          Bar Counter
        </h1>
      </div>
    );
  }

  return (
    <div className="min-w-0 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-stone-700">
        <span className="text-red-700">
          <CalendarIcon />
        </span>
        {formatEventDateTime(event.createdAt, locale)}
      </p>
      <h1 className="truncate text-4xl font-black tracking-tight text-stone-950 md:text-5xl xl:text-6xl">
        {event.name}
      </h1>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <span
          className={`rounded-lg px-3 py-1 text-sm font-black uppercase ${
            event.isActive ? "bg-red-700 text-white" : "bg-stone-200 text-stone-700"
          }`}
        >
          {event.isActive ? m.active : m.closed}
        </span>
        <span className="text-base font-semibold text-stone-700">{m.resultsTotal}</span>
        <span className="text-5xl font-black leading-none text-red-700">{totalCount}</span>
      </div>
    </div>
  );
}

function IconButton({
  children,
  icon,
  variant,
  onClick,
  disabled,
}: {
  children: ReactNode;
  icon: ReactNode;
  variant: "solid" | "outline" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const variants = {
    solid: "bg-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800",
    danger: "bg-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800",
    outline:
      "border-2 border-stone-300 bg-white/80 text-stone-950 shadow-sm active:bg-stone-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-14 items-center justify-center gap-3 rounded-2xl px-6 py-3 text-base font-black transition disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
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
  locale,
  m,
  openResults,
  goHistory,
  openTemplate,
  openSettings,
}: {
  activeEvent: BarEvent;
  totalCount: number;
  locale: Locale;
  m: Messages;
  openResults: () => void;
  goHistory: () => void;
  openTemplate: () => void;
  openSettings: () => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-red-200/70 bg-white/85 shadow-[0_4px_18px_rgba(120,53,15,0.10)] xl:flex">
      <div className="border-b border-stone-200 p-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-red-700">
          <NavCurrentIcon className="h-7 w-7" />
          {m.currentEvent}
        </div>
        <h2 className="mt-5 truncate text-2xl font-black text-stone-950">
          {activeEvent.name}
        </h2>
        <p className="mt-1 text-sm font-medium text-stone-600">
          {formatEventDateTime(activeEvent.createdAt, locale)}
        </p>
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
    "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 border-t-4 px-2 text-sm font-black";

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
        <NavCurrentIcon className="h-7 w-7" />
        {m.currentEvent}
      </button>
      <button
        type="button"
        onClick={goHistory}
        className={`${itemClass} ${
          screen === "history" ? "border-red-700 text-red-700" : "border-transparent text-stone-500"
        }`}
      >
        <NavHistoryIcon className="h-7 w-7" />
        {m.history}
      </button>
      <button
        type="button"
        onClick={openTemplate}
        className={`${itemClass} border-transparent text-stone-500`}
      >
        <NavTemplateIcon className="h-7 w-7" />
        {m.drinkTemplate}
      </button>
      <button
        type="button"
        onClick={openSettings}
        className={`${itemClass} border-transparent text-stone-500`}
      >
        <NavSettingsIcon className="h-7 w-7" />
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
  pinEnabled,
  onLocaleChange,
  onPinEnabledChange,
  onClose,
}: {
  locale: Locale;
  m: Messages;
  pinEnabled: boolean;
  onLocaleChange: (locale: Locale) => void;
  onPinEnabledChange: (enabled: boolean) => void;
  onClose: () => void;
}) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="w-full max-w-xl rounded-3xl border border-red-100 bg-[#fffdfa] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <h2 id="settings-title" className="text-3xl font-black text-stone-950">
          {m.settings}
        </h2>

        <div className="mt-6 rounded-2xl border border-red-100 bg-white/80 p-4">
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-stone-500">
            {m.language}
          </p>
          <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
        </div>

        <div className="mt-4 rounded-2xl border border-red-100 bg-white/80 p-4">
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

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-14 w-full rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
        >
          {m.close}
        </button>
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

export function BarCounterApp() {
  const [locale, setLocaleState] = useState<Locale>("ru");
  const [screen, setScreen] = useState<Screen>("home");
  const [events, setEvents] = useState<BarEvent[]>([]);
  const [activeEvent, setActiveEventState] = useState<BarEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [undoMode, setUndoMode] = useState(false);
  const [editingButton, setEditingButton] = useState<DrinkButton | null>(null);
  const [resultsEvent, setResultsEvent] = useState<BarEvent | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinEnabled, setPinEnabledState] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<(() => void) | null>(
    null,
  );
  const [buttonCountPresetState, setButtonCountPresetState] =
    useState<ButtonCountPreset>(16);

  const m = t(locale);

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
    setPinEnabledState(hasPin());
  }, []);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    setLocaleState(next);
  };

  const requestProtectedAction = (action: () => void) => {
    if (!pinEnabled) {
      action();
      return;
    }
    setPendingProtectedAction(() => action);
  };

  const submitProtectedPin = (pin: string) => {
    if (!verifyPin(pin)) return false;
    const action = pendingProtectedAction;
    setPendingProtectedAction(null);
    action?.();
    return true;
  };

  const handleCreate = async () => {
    const event = await createEvent(eventName, locale);
    setActiveEventState(event);
    setEventName("");
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

  const handleTap = async (buttonId: string) => {
    if (!activeEvent) return;
    if (undoMode) {
      const updated = await applyTap(activeEvent, buttonId, -1);
      setActiveEventState(updated);
      setUndoMode(false);
      await refresh();
      if (resultsEvent?.id === updated.id) setResultsEvent(updated);
      return;
    }
    const updated = await applyTap(activeEvent, buttonId, 1);
    setActiveEventState(updated);
    await refresh();
    if (resultsEvent?.id === updated.id) setResultsEvent(updated);
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
    setScreen("home");
    await refresh();
  };

  const handleSaveEdit = async (patch: Partial<DrinkButton>) => {
    if (!activeEvent || !editingButton) return;
    const updated = await updateButton(activeEvent, editingButton.id, patch);
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

  const totalCount = activeEvent?.buttons.reduce((s, b) => s + b.count, 0) ?? 0;
  const heroEvent = screen === "event" ? activeEvent : null;
  const sortedButtons = activeEvent
    ? [...activeEvent.buttons].sort((a, b) => a.slotIndex - b.slotIndex)
    : [];
  // Presets only change button visibility. Hidden slots stay in event.buttons, so
  // non-zero hidden counts remain in totals, results, CSV export, and future presets.
  const visibleButtons = sortedButtons.slice(
    0,
    Math.min(buttonCountPresetState, sortedButtons.length),
  );
  const gridLayout = getProductGridLayout(visibleButtons.length);
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
  const openSettings = () => setSettingsOpen(true);
  const openActiveResults = () => {
    if (!activeEvent) return;
    void openResults(activeEvent);
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#FAF8F4] text-stone-950">
      <header className="grid shrink-0 grid-cols-1 items-center gap-4 border-b border-red-100/80 bg-[#fffdfa]/95 px-5 py-4 shadow-[0_4px_18px_rgba(120,53,15,0.08)] md:grid-cols-[16rem_minmax(0,1fr)_auto] md:px-8">
        <button
          type="button"
          onClick={() => setScreen("home")}
          className="justify-self-start focus:outline-none"
          aria-label="Rolling Badger Bar — Home"
        >
          <RollingBadgerLogo />
        </button>
        <EventHero event={heroEvent} totalCount={totalCount} locale={locale} m={m} />
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
              onClick={() => setScreen("create")}
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
        <section className="flex flex-1 overflow-auto px-5 py-8 md:items-center md:justify-center">
          <div className="w-full max-w-xl rounded-3xl border border-red-100 bg-white/85 p-5 shadow-[0_6px_22px_rgba(120,53,15,0.10)] md:p-7">
            <h2 className="mb-6 text-3xl font-black text-stone-950">{m.createEvent}</h2>
            <label className="mb-2 block text-sm font-black uppercase tracking-wide text-stone-500">
              {m.eventName}
            </label>
            <input
              className="mb-6 w-full rounded-2xl border-2 border-stone-200 bg-white px-5 py-4 text-2xl font-black text-stone-950 shadow-sm placeholder:text-stone-300 focus:border-red-500 focus:outline-none"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder={locale === "de" ? "Freitag Bar" : "Пятничный бар"}
            />
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
                onClick={() => void handleCreate()}
                className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
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
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-red-100/80 bg-[#fffdfa]/90 px-4 py-3 md:px-8">
            <div className="flex flex-wrap gap-3">
              <IconButton
                icon={<UndoIcon />}
                variant={undoMode ? "solid" : "outline"}
                onClick={() => setUndoMode((current) => !current)}
              >
                {undoMode ? m.undoMode : m.undo}
              </IconButton>
              {activeEvent.isActive && (
                <IconButton
                  icon={<StopSquareIcon />}
                  variant="danger"
                  onClick={() => requestProtectedAction(() => void handleCloseEvent())}
                >
                  {m.closeEvent}
                </IconButton>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <IconButton
                icon={<BarChartIcon />}
                variant="outline"
                onClick={() => void openResults(activeEvent)}
              >
                {m.results}
              </IconButton>
              <IconButton
                icon={<DownloadIcon />}
                variant="solid"
                onClick={() => void handleExport(activeEvent)}
              >
                {m.exportCsv}
              </IconButton>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-4 py-4 md:px-6 xl:px-8">
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
                    cardScale={gridLayout.cardScale}
                    onTap={(id) => void handleTap(id)}
                    onLongPress={setEditingButton}
                  />
                ))}
              </div>
            </div>
            <SidePanel
              activeEvent={activeEvent}
              totalCount={totalCount}
              locale={locale}
              m={m}
              openResults={openActiveResults}
              goHistory={goHistory}
              openTemplate={openTemplate}
              openSettings={openSettings}
            />
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
        onClose={() => setEditingButton(null)}
        onSave={(patch) => void handleSaveEdit(patch)}
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

      {settingsOpen && (
        <SettingsModal
          locale={locale}
          m={m}
          pinEnabled={pinEnabled}
          onLocaleChange={changeLocale}
          onPinEnabledChange={setPinEnabledState}
          onClose={() => setSettingsOpen(false)}
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
