"use client";

import { useState } from "react";
import { DRINK_TEMPLATES } from "@/lib/templates/drinks";
import { t } from "@/lib/i18n/messages";
import type { DrinkButton, DrinkCategory, DrinkColor, DrinkIcon, Locale } from "@/lib/types";

const CATEGORIES: DrinkCategory[] = ["cocktail", "mocktail", "coffee", "soft", "other"];
const COLORS: DrinkColor[] = ["amber", "blue", "green", "red", "purple", "slate"];
const ICONS: DrinkIcon[] = ["cocktail", "mocktail", "coffee", "cup", "bottle", "water", "beer", "wine", "shot", "tea", "other"];

export function EditButtonModal({ locale, button, open, onClose, onSave }: { locale: Locale; button: DrinkButton | null; open: boolean; onClose: () => void; onSave: (patch: Partial<DrinkButton>) => void; }) {
  if (!open || !button) return null;
  return <EditButtonForm key={button.id} locale={locale} button={button} onClose={onClose} onSave={onSave} />;
}

function EditButtonForm({ locale, button, onClose, onSave }: { locale: Locale; button: DrinkButton; onClose: () => void; onSave: (patch: Partial<DrinkButton>) => void; }) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-slate-900 p-5 text-slate-100 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-button-title">
        <h2 id="edit-button-title" className="mb-4 text-xl font-bold">{m.editButton}</h2>
        <label className="mb-3 block text-sm font-medium">{m.displayName}</label>
        <input className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="mb-2 block text-sm font-medium">{m.template}</label>
        <select className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">—</option>
          {DRINK_TEMPLATES.map((template) => (<option key={template.id} value={template.id}>{template.labels[locale]}</option>))}
        </select>
        <label className="mb-2 block text-sm font-medium">{m.category}</label>
        <select className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" value={category} onChange={(e) => setCategory(e.target.value as DrinkCategory)}>
          {CATEGORIES.map((value) => (<option key={value} value={value}>{m.categories[value]}</option>))}
        </select>
        <label className="mb-2 block text-sm font-medium">{m.icon}</label>
        <select className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" value={icon} onChange={(e) => setIcon(e.target.value as DrinkIcon)}>
          {ICONS.map((value) => (<option key={value} value={value}>{m.icons[value]}</option>))}
        </select>
        <label className="mb-2 block text-sm font-medium">{m.color}</label>
        <select className="mb-6 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3" value={color} onChange={(e) => setColor(e.target.value as DrinkColor)}>
          {COLORS.map((value) => (<option key={value} value={value}>{m.colors[value]}</option>))}
        </select>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl bg-slate-700 px-4 py-3 font-semibold">{m.cancel}</button>
          <button type="button" onClick={() => onSave({ name: name.trim() || button.name, templateId: templateId || undefined, category, icon, color })} className="min-h-12 flex-1 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950">{m.save}</button>
        </div>
      </div>
    </div>
  );
}
