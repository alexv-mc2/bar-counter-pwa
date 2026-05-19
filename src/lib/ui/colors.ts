import type { DrinkColor } from "@/lib/types";

export const COLOR_CLASSES: Record<
  DrinkColor,
  { categoryDot: string; badge: string }
> = {
  amber:  { categoryDot: "bg-amber-400",   badge: "bg-red-600 text-white" },
  blue:   { categoryDot: "bg-blue-400",    badge: "bg-red-600 text-white" },
  green:  { categoryDot: "bg-green-500",   badge: "bg-red-600 text-white" },
  red:    { categoryDot: "bg-red-500",     badge: "bg-red-600 text-white" },
  purple: { categoryDot: "bg-purple-500",  badge: "bg-red-600 text-white" },
  slate:  { categoryDot: "bg-stone-400",   badge: "bg-red-600 text-white" },
};
