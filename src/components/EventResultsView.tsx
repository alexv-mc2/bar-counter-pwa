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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-results-title"
      >
        <div className="overflow-y-auto p-5">
          <h2
            id="event-results-title"
            className="mb-0.5 text-xl font-black text-stone-900"
          >
            {m.results}
          </h2>
          <p className="mb-4 text-sm text-stone-400">
            {formatEventDateTime(event.createdAt, locale)}
          </p>

          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">{m.eventName}</dt>
              <dd className="text-right font-bold text-stone-900">{event.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">{m.resultsStatus}</dt>
              <dd className="text-right">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                    event.isActive
                      ? "bg-red-600 text-white"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {status}
                </span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-stone-100 pt-3">
              <dt className="font-semibold text-stone-700">{m.resultsTotal}</dt>
              <dd className="text-3xl font-black text-red-600">{total}</dd>
            </div>
          </dl>

          {drinks.length === 0 ? (
            <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-stone-400">
              {m.resultsEmpty}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400">
                  <th className="pb-2 font-semibold">{m.resultsDrink}</th>
                  <th className="pb-2 text-right font-semibold">{m.resultsCount}</th>
                </tr>
              </thead>
              <tbody>
                {drinks.map((drink) => (
                  <tr key={drink.id} className="border-b border-stone-100">
                    <td className="py-2 pr-2 text-stone-900">{drink.name}</td>
                    <td className="py-2 text-right font-black text-stone-900">
                      {drink.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex gap-3 border-t border-stone-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-xl border-2 border-stone-300 bg-white px-4 py-3 font-semibold text-stone-700 active:bg-stone-100"
          >
            {m.back}
          </button>
          <button
            type="button"
            onClick={onExport}
            className="min-h-12 flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white shadow-sm active:bg-red-700"
          >
            {m.exportCsv}
          </button>
        </div>
      </div>
    </div>
  );
}
