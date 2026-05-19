"use client";

import { formatEventDateTime, getEventTotals } from "@/lib/events/results";
import { t } from "@/lib/i18n/messages";
import type { BarEvent, Locale } from "@/lib/types";

export function EventResultsView({
  event,
  locale,
  onClose,
  onExport,
}: {
  event: BarEvent;
  locale: Locale;
  onClose: () => void;
  onExport: () => void;
}) {
  const m = t(locale);
  const { total, drinks } = getEventTotals(event, locale);
  const status = event.isActive ? m.active : m.closed;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-red-100 bg-[#fffdfa] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-results-title"
      >
        <div className="overflow-y-auto p-6">
          <h2
            id="event-results-title"
            className="mb-1 text-4xl font-black tracking-tight text-stone-950"
          >
            {m.results}
          </h2>
          <p className="mb-5 text-base font-medium text-stone-500">
            {formatEventDateTime(event.createdAt, locale)}
          </p>

          <dl className="mb-5 space-y-3 text-base">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">{m.eventName}</dt>
              <dd className="text-right text-xl font-black text-stone-950">{event.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">{m.resultsStatus}</dt>
              <dd className="text-right">
                <span
                  className={`inline-block rounded-lg px-3 py-1 text-xs font-black uppercase ${
                    event.isActive
                      ? "bg-red-700 text-white"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {status}
                </span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-red-100 pt-4">
              <dt className="font-black text-stone-800">{m.resultsTotal}</dt>
              <dd className="text-6xl font-black leading-none text-red-700">{total}</dd>
            </div>
          </dl>

          {drinks.length === 0 ? (
            <p className="rounded-2xl border border-stone-200 bg-white px-4 py-8 text-center text-lg font-bold text-stone-400">
              {m.resultsEmpty}
            </p>
          ) : (
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="pb-3 font-black">{m.resultsDrink}</th>
                  <th className="pb-3 text-right font-black">{m.resultsCount}</th>
                </tr>
              </thead>
              <tbody>
                {drinks.map((drink) => (
                  <tr key={drink.id} className="border-b border-stone-100">
                    <td className="py-3 pr-2 font-bold text-stone-950">{drink.name}</td>
                    <td className="py-3 text-right text-xl font-black text-stone-950">
                      {drink.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex gap-3 border-t border-red-100 bg-white/80 p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
          >
            {m.back}
          </button>
          <button
            type="button"
            onClick={onExport}
            className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
          >
            {m.exportCsv}
          </button>
        </div>
      </div>
    </div>
  );
}
