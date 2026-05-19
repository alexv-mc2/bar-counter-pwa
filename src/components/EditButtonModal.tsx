"use client";

import { useState } from "react";
import { DRINK_TEMPLATES } from "@/lib/templates/drinks";
import { t } from "@/lib/i18n/messages";
import type { DrinkButton, DrinkCategory, DrinkColor, DrinkIcon, Locale } from "@/lib/types";

const CATEGORIES: DrinkCategory[] = [
  "cocktail",
  "mocktail",
  "coffee",
  "soft",
  "beer",
  "wine",
  "tea",
  "other",
];
const COLORS: DrinkColor[] = ["amber", "blue", "green", "red", "purple", "slate"];
const ICONS: DrinkIcon[] = [
  "cocktail",
  "mocktail",
  "coffee",
  "cup",
  "bottle",
  "water",
  "beer",
  "wine",
  "shot",
  "tea",
  "other",
];

const LABEL_CLS =
  "mb-1.5 block text-sm font-black uppercase tracking-wide text-stone-500";
const SELECT_CLS =
  "mb-4 w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-base font-bold text-stone-900 focus:border-red-500 focus:outline-none";

export function EditButtonModal({
  locale,
  button,
  open,
  onClose,
  onSave,
}: {
  locale: Locale;
  button: DrinkButton | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<DrinkButton>) => void;
}) {
  if (!open || !button) return null;
  return (
    <EditButtonForm
      key={button.id}
      locale={locale}
      button={button}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EditButtonForm({
  locale,
  button,
  onClose,
  onSave,
}: {
  locale: Locale;
  button: DrinkButton;
  onClose: () => void;
  onSave: (patch: Partial<DrinkButton>) => void;
}) {
  const m = t(locale);
  const [name, setName] = useState(button.name);
  const [templateId, setTemplateId] = useState(button.templateId ?? "");
  const [category, setCategory] = useState<DrinkCategory>(button.category);
  const [icon, setIcon] = useState<DrinkIcon>(button.icon);
  const [color, setColor] = useState<DrinkColor>(button.color);

  const applyTemplate = (id: string) => {
    const template = DRINK_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    setTemplateId(template.id);
    setName(template.labels[locale]);
    setCategory(template.category);
    setIcon(template.icon);
    setColor(template.color);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/55 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-red-100 bg-[#fffdfa] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-button-title"
      >
        <h2
          id="edit-button-title"
          className="mb-5 text-3xl font-black text-stone-950"
        >
          {m.editButton}
        </h2>

        <label className={LABEL_CLS}>{m.displayName}</label>
        <input
          className="mb-4 w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-xl font-black text-stone-950 placeholder:text-stone-300 focus:border-red-500 focus:outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className={LABEL_CLS}>{m.template}</label>
        <select
          className={SELECT_CLS}
          value={templateId}
          onChange={(e) => applyTemplate(e.target.value)}
        >
          <option value="">—</option>
          {DRINK_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.labels[locale]}
            </option>
          ))}
        </select>

        <label className={LABEL_CLS}>{m.category}</label>
        <select
          className={SELECT_CLS}
          value={category}
          onChange={(e) => setCategory(e.target.value as DrinkCategory)}
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {m.categories[value]}
            </option>
          ))}
        </select>

        <label className={LABEL_CLS}>{m.icon}</label>
        <select
          className={SELECT_CLS}
          value={icon}
          onChange={(e) => setIcon(e.target.value as DrinkIcon)}
        >
          {ICONS.map((value) => (
            <option key={value} value={value}>
              {m.icons[value]}
            </option>
          ))}
        </select>

        <label className={LABEL_CLS}>{m.color}</label>
        <select
          className={SELECT_CLS}
          value={color}
          onChange={(e) => setColor(e.target.value as DrinkColor)}
        >
          {COLORS.map((value) => (
            <option key={value} value={value}>
              {m.colors[value]}
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 font-black text-stone-700 active:bg-stone-100"
          >
            {m.cancel}
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                name: name.trim() || button.name,
                templateId: templateId || undefined,
                category,
                icon,
                color,
              })
            }
            className="min-h-14 flex-1 rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-[0_8px_18px_rgba(185,28,28,0.24)] active:bg-red-800"
          >
            {m.save}
          </button>
        </div>
      </div>
    </div>
  );
}
