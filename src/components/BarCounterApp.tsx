"use client";

import { useCallback, useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DrinkGridButton } from "@/components/DrinkGridButton";
import { EditButtonModal } from "@/components/EditButtonModal";
import { buildEventCsv, downloadCsv } from "@/lib/csv/export";
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

export function BarCounterApp() {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === "undefined" ? "ru" : getLocale(),
  );
  const [screen, setScreen] = useState<Screen>("home");
  const [events, setEvents] = useState<BarEvent[]>([]);
  const [activeEvent, setActiveEventState] = useState<BarEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [undoMode, setUndoMode] = useState(false);
  const [editingButton, setEditingButton] = useState<DrinkButton | null>(null);

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
    } else {
      const updated = await applyTap(activeEvent, buttonId, 1);
      setActiveEventState(updated);
    }
    await refresh();
  };

  const handleExport = async (event: BarEvent) => {
    const logs = await getTapLogsForEvent(event.id);
    const csv = buildEventCsv(event, logs);
    const safeName = event.name.replace(/[^a-zA-Z0-9-_]+/g, "_");
    downloadCsv(`${safeName || "event"}-${event.id.slice(0, 8)}.csv`, csv);
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
  };

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-bold sm:text-xl">{m.appTitle}</h1>
        <LanguageSwitcher locale={locale} onChange={changeLocale} />
      </header>

      {screen === "home" && (
        <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
          {activeEvent?.isActive ? (
            <button
              type="button"
              onClick={() => void handleContinue()}
              className="min-h-14 rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-slate-950"
            >
              {m.continueEvent}: {activeEvent.name}
            </button>
          ) : activeEvent ? (
            <button
              type="button"
              onClick={() => void handleContinue()}
              className="min-h-14 rounded-2xl bg-slate-700 px-6 py-4 text-lg font-semibold"
            >
              {m.continueEvent}: {activeEvent.name}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setScreen("create")}
            className="min-h-14 rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-slate-950"
          >
            {m.createEvent}
          </button>
          <button
            type="button"
            onClick={() => setScreen("history")}
            className="min-h-14 rounded-2xl bg-slate-800 px-6 py-4 text-lg font-semibold"
          >
            {m.history}
          </button>
        </section>
      )}

      {screen === "create" && (
        <section className="mx-auto max-w-xl p-4">
          <label className="mb-2 block font-medium">{m.eventName}</label>
          <input
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder={locale === "de" ? "Freitag Bar" : "Пятничный бар"}
          />
          <ActionRow
            onCancel={() => setScreen("home")}
            onSave={() => void handleCreate()}
            cancelLabel={m.back}
            saveLabel={m.startEvent}
          />
        </section>
      )}

      {screen === "history" && (
        <section className="mx-auto max-w-2xl p-4">
          <button
            type="button"
            onClick={() => setScreen("home")}
            className="mb-4 min-h-11 rounded-xl bg-slate-800 px-4 py-2 font-semibold"
          >
            {m.back}
          </button>
          {events.length === 0 ? (
            <p>{m.noEvents}</p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-4"
                >
                  <div>
                    <p className="font-bold">{event.name}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(event.createdAt).toLocaleString(locale === "de" ? "de-DE" : "ru-RU")} · {event.isActive ? m.active : m.closed}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="min-h-11 rounded-lg bg-slate-700 px-4 py-2 font-semibold"
                      onClick={async () => {
                        const target = event.isActive ? event : (await setActiveEvent(event.id)) ?? event;
                        setActiveEventState(target);
                        setScreen("event");
                      }}
                    >
                      {m.continueEvent}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950"
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

      {screen === "event" && activeEvent && (
        <section className="flex flex-col gap-3 p-3 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setScreen("home")}
              className="min-h-11 rounded-xl bg-slate-800 px-4 py-2 font-semibold"
            >
              {m.back}
            </button>
            <button
              type="button"
              onClick={() => void handleExport(activeEvent)}
              className="min-h-11 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-slate-950"
            >
              {m.exportCsv}
            </button>
          </div>
          <div className="px-1">
            <h2 className="text-xl font-bold">{activeEvent.name}</h2>
            <p className="text-sm text-slate-400">{m.longPressHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUndoMode(true)}
              className={`min-h-12 rounded-xl px-5 py-3 font-bold ${undoMode ? "bg-red-500 text-white ring-4 ring-red-300" : "bg-slate-800 text-slate-100"}`}
            >
              {undoMode ? m.undoMode : m.undo}
            </button>
            {activeEvent.isActive && (
              <button
                type="button"
                onClick={() => void handleCloseEvent()}
                className="min-h-12 rounded-xl bg-slate-700 px-5 py-3 font-semibold"
              >
                {m.closeEvent}
              </button>
            )}
          </div>
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
          <EditButtonModal
            locale={locale}
            button={editingButton}
            open={Boolean(editingButton)}
            onClose={() => setEditingButton(null)}
            onSave={(patch) => void handleSaveEdit(patch)}
          />
        </section>
      )}
    </main>
  );
}

function ActionRow({
  onCancel,
  onSave,
  cancelLabel,
  saveLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  cancelLabel: string;
  saveLabel: string;
}) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} className="min-h-12 flex-1 rounded-xl bg-slate-700 px-4 py-3 font-semibold">
        {cancelLabel}
      </button>
      <button type="button" onClick={onSave} className="min-h-12 flex-1 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950">
        {saveLabel}
      </button>
    </div>
  );
}
