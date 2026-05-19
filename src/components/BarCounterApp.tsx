"use client";

import { useCallback, useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DrinkGridButton } from "@/components/DrinkGridButton";
import { EditButtonModal } from "@/components/EditButtonModal";
import { EventResultsView } from "@/components/EventResultsView";
import { buildEventCsv, downloadCsv, eventCsvFilename } from "@/lib/csv/export";
import { formatEventDateTime } from "@/lib/events/results";
import { t } from "@/lib/i18n/messages";
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
import { getLastActiveEventId, getLocale, setLocale } from "@/lib/storage/preferences";
import type { BarEvent, DrinkButton, Locale } from "@/lib/types";

type Screen = "home" | "create" | "event" | "history";

function RollingBadgerLogo() {
  return (
    <div
      className="flex select-none flex-col items-start leading-none"
      aria-label="Rolling Badger Bar"
    >
      <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400">
        Rolling
      </span>
      <span className="text-lg font-black tracking-tight text-stone-900">Badger</span>
      <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400">
        Bar
      </span>
      <span className="mt-0.5 block h-[2px] w-full rounded-full bg-red-600" />
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

export function BarCounterApp() {
  const [locale, setLocaleState] = useState<Locale>("ru");
  const [screen, setScreen] = useState<Screen>("home");
  const [events, setEvents] = useState<BarEvent[]>([]);
  const [activeEvent, setActiveEventState] = useState<BarEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [undoMode, setUndoMode] = useState(false);
  const [editingButton, setEditingButton] = useState<DrinkButton | null>(null);
  const [resultsEvent, setResultsEvent] = useState<BarEvent | null>(null);

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
  }, []);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    setLocaleState(next);
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

  const totalCount = activeEvent?.buttons.reduce((s, b) => s + b.count, 0) ?? 0;

  return (
    <main className="flex min-h-dvh flex-col text-stone-900">
      {/* ── Global header ── */}
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 py-2.5 shadow-sm">
        <button
          type="button"
          onClick={() => setScreen("home")}
          className="focus:outline-none"
          aria-label="Rolling Badger Bar — Home"
        >
          <RollingBadgerLogo />
        </button>
        <LanguageSwitcher locale={locale} onChange={changeLocale} />
      </header>

      {/* ══ HOME ══ */}
      {screen === "home" && (
        <section className="mx-auto flex w-full max-w-sm flex-col gap-3 px-4 py-10">
          <h2 className="mb-2 text-2xl font-black text-stone-900">{m.appTitle}</h2>

          {activeEvent?.isActive && (
            <button
              type="button"
              onClick={() => void handleContinue()}
              className="min-h-14 rounded-2xl bg-red-600 px-6 py-4 text-left text-base font-bold text-white shadow-md active:bg-red-700"
            >
              <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">
                {m.continueEvent}
              </span>
              {activeEvent.name}
            </button>
          )}
          {activeEvent && !activeEvent.isActive && (
            <button
              type="button"
              onClick={() => void handleContinue()}
              className="min-h-14 rounded-2xl border-2 border-stone-300 bg-white px-6 py-4 text-left text-base font-semibold text-stone-700 shadow-sm active:bg-stone-100"
            >
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-400">
                {m.continueEvent}
              </span>
              {activeEvent.name}
            </button>
          )}
          <button
            type="button"
            onClick={() => setScreen("create")}
            className="min-h-14 rounded-2xl bg-red-600 px-6 py-4 text-lg font-bold text-white shadow-md active:bg-red-700"
          >
            {m.createEvent}
          </button>
          <button
            type="button"
            onClick={() => setScreen("history")}
            className="min-h-14 rounded-2xl border-2 border-stone-300 bg-white px-6 py-4 text-lg font-semibold text-stone-700 shadow-sm active:bg-stone-100"
          >
            {m.history}
          </button>
        </section>
      )}

      {/* ══ CREATE ══ */}
      {screen === "create" && (
        <section className="mx-auto w-full max-w-sm px-4 py-8">
          <h2 className="mb-5 text-xl font-black text-stone-900">{m.createEvent}</h2>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500">
            {m.eventName}
          </label>
          <input
            className="mb-5 w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg font-medium text-stone-900 shadow-sm placeholder:text-stone-300 focus:border-red-500 focus:outline-none"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder={locale === "de" ? "Freitag Bar" : "Пятничный бар"}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setScreen("home")}
              className="min-h-12 flex-1 rounded-xl border-2 border-stone-300 bg-white px-4 py-3 font-semibold text-stone-700 active:bg-stone-100"
            >
              {m.back}
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="min-h-12 flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white shadow-md active:bg-red-700"
            >
              {m.startEvent}
            </button>
          </div>
        </section>
      )}

      {/* ══ HISTORY ══ */}
      {screen === "history" && (
        <section className="mx-auto w-full max-w-2xl px-4 py-4">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScreen("home")}
              className="flex items-center gap-1 rounded-xl border-2 border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-600 active:bg-stone-100"
            >
              <BackArrowIcon />
              {m.back}
            </button>
            <h2 className="text-xl font-black text-stone-900">{m.history}</h2>
          </div>
          {events.length === 0 ? (
            <p className="text-stone-500">{m.noEvents}</p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
                >
                  <div>
                    <p className="font-black text-stone-900">{event.name}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {new Date(event.createdAt).toLocaleString(
                        locale === "de" ? "de-DE" : "ru-RU",
                      )}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        event.isActive
                          ? "bg-red-600 text-white"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {event.isActive ? m.active : m.closed}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="min-h-10 rounded-xl border-2 border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 active:bg-stone-100"
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
                      className="min-h-10 rounded-xl border-2 border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 active:bg-stone-100"
                      onClick={() => void openResults(event)}
                    >
                      {m.results}
                    </button>
                    <button
                      type="button"
                      className="min-h-10 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm active:bg-red-700"
                      onClick={() => void handleExport(event)}
                    >
                      {m.exportCsv}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ══ EVENT ══ */}
      {screen === "event" && activeEvent && (
        <section className="flex min-h-0 flex-1 flex-col">
          {/* Event meta bar */}
          <div className="flex-shrink-0 border-b border-stone-200 bg-white px-4 py-2 text-center">
            <p className="text-xs text-stone-400">
              {formatEventDateTime(activeEvent.createdAt, locale)}
            </p>
            <h2 className="text-2xl font-black leading-tight text-stone-900">
              {activeEvent.name}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                  activeEvent.isActive
                    ? "bg-red-600 text-white"
                    : "bg-stone-300 text-stone-700"
                }`}
              >
                {activeEvent.isActive ? m.active : m.closed}
              </span>
              <span className="text-sm text-stone-500">
                {m.resultsTotal}:{" "}
                <span className="text-base font-black text-stone-900">
                  {totalCount}
                </span>
              </span>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 py-2">
            {/* Left: undo + close */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUndoMode((m) => !m)}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  undoMode
                    ? "bg-red-600 text-white ring-2 ring-red-300 ring-offset-1"
                    : "border-2 border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                }`}
              >
                <UndoIcon />
                {undoMode ? m.undoMode : m.undo}
              </button>
              {activeEvent.isActive && (
                <button
                  type="button"
                  onClick={() => void handleCloseEvent()}
                  className="flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm active:bg-red-700"
                >
                  <StopSquareIcon />
                  {m.closeEvent}
                </button>
              )}
            </div>
            {/* Right: results + export */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openResults(activeEvent)}
                className="flex min-h-10 items-center gap-2 rounded-xl border-2 border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:border-stone-400 active:bg-stone-100"
              >
                <BarChartIcon />
                {m.results}
              </button>
              <button
                type="button"
                onClick={() => void handleExport(activeEvent)}
                className="flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm active:bg-red-700"
              >
                <DownloadIcon />
                {m.exportCsv}
              </button>
            </div>
          </div>

          {/* Hint */}
          <p className="flex-shrink-0 px-3 pt-1.5 text-center text-xs text-stone-400">
            {m.longPressHint}
          </p>

          {/* Drink grid */}
          <div className="flex-1 overflow-auto p-2 sm:p-3">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[...activeEvent.buttons]
                .sort((a, b) => a.slotIndex - b.slotIndex)
                .map((button) => (
                  <DrinkGridButton
                    key={button.id}
                    button={button}
                    undoMode={undoMode}
                    onTap={(id) => void handleTap(id)}
                    onLongPress={setEditingButton}
                  />
                ))}
            </div>
          </div>

          <EditButtonModal
            locale={locale}
            button={editingButton}
            open={Boolean(editingButton)}
            onClose={() => setEditingButton(null)}
            onSave={(patch) => void handleSaveEdit(patch)}
          />
        </section>
      )}

      {/* Results overlay */}
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
