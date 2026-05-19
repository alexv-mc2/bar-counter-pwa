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
    <div className="flex rounded-xl bg-slate-800 p-1 text-sm font-semibold">
      {(["ru", "de"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`min-h-11 min-w-14 rounded-lg px-4 py-2 ${
            locale === code ? "bg-amber-500 text-slate-950" : "text-slate-200"
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
