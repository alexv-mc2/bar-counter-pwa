import {
  Beer,
  Coffee,
  CupSoda,
  Droplets,
  GlassWater,
  Martini,
  Milk,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { DrinkIcon } from "@/lib/types";

const ICON_MAP: Record<DrinkIcon, LucideIcon> = {
  cocktail: Martini,
  mocktail: GlassWater,
  coffee: Coffee,
  cup: CupSoda,
  bottle: Milk,
  water: Droplets,
  beer: Beer,
  wine: Wine,
  shot: GlassWater,
  tea: CupSoda,
  other: CupSoda,
};

export function DrinkIconView({
  icon,
  className,
}: {
  icon: DrinkIcon;
  className?: string;
}) {
  const Icon = ICON_MAP[icon];
  return <Icon className={className} aria-hidden />;
}
