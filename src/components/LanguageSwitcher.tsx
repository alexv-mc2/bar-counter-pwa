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
    <div className="flex rounded-xl border border-stone-300 bg-white p-1 shadow-sm">
      {(["ru", "de"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`min-h-9 min-w-12 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
            locale === code
              ? "bg-red-600 text-white"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
