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
    <div className="flex justify-self-end rounded-2xl border border-stone-300 bg-white p-1.5 shadow-sm">
      {(["ru", "de"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`min-h-12 min-w-16 rounded-xl px-5 py-2 text-base font-black transition-colors ${
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
