import type { DrinkColor } from "@/lib/types";

export const COLOR_CLASSES: Record<
  DrinkColor,
  { accent: string; soft: string; badge: string }
> = {
  amber: {
    accent: "bg-amber-500",
    soft: "bg-amber-50 text-amber-900",
    badge: "bg-red-700 text-white",
  },
  blue: {
    accent: "bg-sky-500",
    soft: "bg-sky-50 text-sky-950",
    badge: "bg-red-700 text-white",
  },
  green: {
    accent: "bg-emerald-600",
    soft: "bg-emerald-50 text-emerald-950",
    badge: "bg-red-700 text-white",
  },
  red: {
    accent: "bg-red-600",
    soft: "bg-red-50 text-red-950",
    badge: "bg-red-700 text-white",
  },
  purple: {
    accent: "bg-violet-600",
    soft: "bg-violet-50 text-violet-950",
    badge: "bg-red-700 text-white",
  },
  slate: {
    accent: "bg-stone-500",
    soft: "bg-stone-100 text-stone-950",
    badge: "bg-red-700 text-white",
  },
};
