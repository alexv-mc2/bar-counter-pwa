import type { DrinkColor } from "@/lib/types";

export const COLOR_CLASSES: Record<
  DrinkColor,
  { bg: string; ring: string; badge: string }
> = {
  amber: {
    bg: "bg-amber-500",
    ring: "ring-amber-300",
    badge: "bg-amber-900 text-amber-50",
  },
  blue: {
    bg: "bg-blue-500",
    ring: "ring-blue-300",
    badge: "bg-blue-900 text-blue-50",
  },
  green: {
    bg: "bg-green-600",
    ring: "ring-green-300",
    badge: "bg-green-900 text-green-50",
  },
  red: {
    bg: "bg-red-500",
    ring: "ring-red-300",
    badge: "bg-red-900 text-red-50",
  },
  purple: {
    bg: "bg-purple-500",
    ring: "ring-purple-300",
    badge: "bg-purple-900 text-purple-50",
  },
  slate: {
    bg: "bg-slate-600",
    ring: "ring-slate-300",
    badge: "bg-slate-900 text-slate-50",
  },
};
