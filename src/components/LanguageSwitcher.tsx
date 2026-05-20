"use client";

import type { Locale } from "@/lib/types";

export function LanguageSwitcher({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="flex justify-self-end rounded-xl border border-stone-300 bg-white p-1 shadow-sm sm:rounded-2xl sm:p-1.5">
      {(["ru", "de"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`min-h-9 min-w-11 rounded-lg px-3 py-1.5 text-sm font-black transition-colors sm:min-h-11 sm:min-w-14 sm:rounded-xl sm:px-4 sm:text-base ${
            locale === code
              ? "bg-red-700 text-white shadow-[0_5px_14px_rgba(185,28,28,0.20)]"
              : "text-stone-700 hover:text-stone-950"
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
