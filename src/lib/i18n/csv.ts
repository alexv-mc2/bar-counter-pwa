import type { Locale } from "@/lib/types";

const labels = {
  ru: {
    event: "Мероприятие",
    date: "Дата",
    totalDrinks: "Всего напитков",
    drink: "Напиток",
    quantity: "Количество",
    tapLogTitle: "Журнал",
    tapTime: "Время",
    tapDrink: "Напиток",
    tapAction: "Действие",
  },
  de: {
    event: "Event",
    date: "Datum",
    totalDrinks: "Getränke gesamt",
    drink: "Getränk",
    quantity: "Anzahl",
    tapLogTitle: "Protokoll",
    tapTime: "Zeit",
    tapDrink: "Getränk",
    tapAction: "Aktion",
  },
} as const;

export function csvLabels(locale: Locale) {
  return labels[locale];
}
