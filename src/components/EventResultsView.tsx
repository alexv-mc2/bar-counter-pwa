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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-slate-900 text-slate-100 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-results-title"
      >
        <div className="overflow-y-auto p-5">
          <h2 id="event-results-title" className="mb-4 text-xl font-bold">
            {m.results}
          </h2>
          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">{m.eventName}</dt>
              <dd className="font-semibold text-right">{event.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">{m.resultsDateTime}</dt>
              <dd className="text-right">{formatEventDateTime(event.createdAt, locale)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">{m.resultsStatus}</dt>
              <dd className="text-right">{status}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-800 pt-2 text-base">
              <dt className="font-medium">{m.resultsTotal}</dt>
              <dd className="font-bold">{total}</dd>
            </div>
          </dl>

          {drinks.length === 0 ? (
            <p className="rounded-xl bg-slate-800 px-4 py-6 text-center text-slate-300">
              {m.resultsEmpty}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2 font-medium">{m.resultsDrink}</th>
                  <th className="pb-2 text-right font-medium">{m.resultsCount}</th>
                </tr>
              </thead>
              <tbody>
                {drinks.map((drink) => (
                  <tr key={drink.id} className="border-b border-slate-800">
                    <td className="py-2 pr-2">{drink.name}</td>
                    <td className="py-2 text-right font-bold">{drink.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-xl bg-slate-700 px-4 py-3 font-semibold"
          >
            {m.back}
          </button>
          <button
            type="button"
            onClick={onExport}
            className="min-h-12 flex-1 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950"
          >
            {m.exportCsv}
          </button>
        </div>
      </div>
    </div>
  );
}
