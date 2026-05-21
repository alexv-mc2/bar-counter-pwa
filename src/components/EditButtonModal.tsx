"use client";

import { useState } from "react";
import { DRINK_TEMPLATES } from "@/lib/templates/drinks";
import { t } from "@/lib/i18n/messages";
import type {
  DrinkButton,
  DrinkCategory,
  DrinkColor,
  DrinkIcon,
  DrinkTemplate,
  Locale,
} from "@/lib/types";

const CATEGORIES: DrinkCategory[] = [
  "cocktail",
  "mocktail",
  "warm",
  "soft",
  "beer",
  "wine",
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
  mode = "edit",
  templates = DRINK_TEMPLATES,
  onClose,
  onSave,
  onHide,
}: {
  locale: Locale;
  button: DrinkButton | null;
  open: boolean;
  mode?: "edit" | "add";
  templates?: DrinkTemplate[];
  onClose: () => void;
  onSave: (patch: Partial<DrinkButton>, options?: { saveAsTemplate: boolean }) => void;
  onHide?: (button: DrinkButton) => void;
}) {
  if (!open || !button) return null;
  return (
    <EditButtonForm
      key={button.id}
      locale={locale}
      button={button}
      mode={mode}
      templates={templates}
      onClose={onClose}
      onSave={onSave}
      onHide={onHide}
    />
  );
}

function EditButtonForm({
  locale,
  button,
  mode,
  templates,
  onClose,
  onSave,
  onHide,
}: {
  locale: Locale;
  button: DrinkButton;
  mode: "edit" | "add";
  templates: DrinkTemplate[];
  onClose: () => void;
  onSave: (patch: Partial<DrinkButton>, options?: { saveAsTemplate: boolean }) => void;
  onHide?: (button: DrinkButton) => void;
}) {
  const m = t(locale);
  const [name, setName] = useState(button.name);
  const [templateId, setTemplateId] = useState(button.templateId ?? "");
  const [category, setCategory] = useState<DrinkCategory>(button.category);
  const [icon, setIcon] = useState<DrinkIcon>(button.icon);
  const [color, setColor] = useState<DrinkColor>(button.color);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);
  const [hideError, setHideError] = useState("");

  const applyTemplate = (id: string) => {
    if (!id) {
      setTemplateId("");
      return;
    }
    const template = templates.find((item) => item.id === id);
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
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-red-100 bg-[#fffdfa] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-button-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-red-100 px-6 py-4">
          <h2
            id="edit-button-title"
            className="text-3xl font-black text-stone-950"
          >
            {mode === "add" ? m.addProduct : m.editButton}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-stone-300 bg-white px-3 py-1.5 text-sm font-black text-stone-700 active:bg-stone-100"
          >
            {m.cancel}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
            {templates.map((template) => (
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

          <button
            type="button"
            onClick={() => setSaveAsTemplate((current) => !current)}
            className={`mb-4 min-h-12 w-full rounded-2xl border-2 px-4 py-3 text-left font-black transition ${
              saveAsTemplate
                ? "border-red-700 bg-red-50 text-red-800"
                : "border-stone-300 bg-white text-stone-700 active:bg-stone-100"
            }`}
          >
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-current text-sm leading-none">
              {saveAsTemplate ? "✓" : ""}
            </span>
            {m.saveAsTemplate}
          </button>

          {mode === "edit" && onHide && (
            <div className="rounded-2xl border border-stone-200 bg-white/80 p-3">
              {hideError && (
                <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                  {hideError}
                </p>
              )}
              {hideConfirmOpen ? (
                <div>
                  <p className="mb-3 text-base font-black text-stone-900">
                    {m.hideButtonQuestion}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setHideConfirmOpen(false)}
                      className="min-h-12 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 py-2 font-black text-stone-700 active:bg-stone-100"
                    >
                      {m.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => onHide(button)}
                      className="min-h-12 flex-1 rounded-2xl border-2 border-red-200 bg-white px-4 py-2 font-black text-red-700 active:bg-red-50"
                    >
                      {m.hideButton}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (button.count > 0 || button.pendingCount > 0) {
                      setHideError(m.hideButtonBlocked);
                      return;
                    }
                    setHideError("");
                    setHideConfirmOpen(true);
                  }}
                  className="min-h-12 w-full rounded-2xl border-2 border-red-200 bg-white px-4 py-2 font-black text-red-700 active:bg-red-50"
                >
                  {m.hideButton}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-red-100 px-6 py-4">
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
                isVisible: true,
              },
              {
                saveAsTemplate,
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
