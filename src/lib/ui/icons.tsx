import type { DrinkCategory, DrinkIcon } from "@/lib/types";

type IconProps = {
  className?: string;
};

const sketchStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function CocktailSketch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="M18 16h60L50 48v25" />
      <path {...sketchStroke} d="M38 83h24" />
      <path {...sketchStroke} d="M32 26c9 5 24 5 34 0" />
      <path {...sketchStroke} d="M70 13c6 0 10 4 10 9s-4 9-10 9-10-4-10-9 4-9 10-9Z" />
      <path {...sketchStroke} d="M63 19c5 1 9 3 14 7" />
      <path {...sketchStroke} d="M43 49c4 2 10 2 14 0" />
    </svg>
  );
}

function MocktailSketch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="M25 20h46l-6 58H31L25 20Z" />
      <path {...sketchStroke} d="M30 35c9-5 25 6 36 0" />
      <path {...sketchStroke} d="M40 59c8-15 18-18 29-15" />
      <path {...sketchStroke} d="M55 45c-4-10 2-18 13-20 1 10-4 17-13 20Z" />
      <path {...sketchStroke} d="M35 48h2M45 67h2M58 56h2" />
    </svg>
  );
}

function CoffeeSketch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="M23 39h43v22c0 10-8 18-18 18h-7c-10 0-18-8-18-18V39Z" />
      <path {...sketchStroke} d="M66 44h7c7 0 12 5 12 11s-5 11-12 11h-7" />
      <path {...sketchStroke} d="M19 80h55" />
      <path {...sketchStroke} d="M35 15c-5 6 5 9 0 15M49 15c-5 6 5 9 0 15M62 16c-4 5 4 8 0 13" />
      <path {...sketchStroke} d="M31 47c7 3 18 3 27 0" />
    </svg>
  );
}

function SoftDrinkSketch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="M39 15h18l3 11-5 7 7 46H34l7-46-5-7 3-11Z" />
      <path {...sketchStroke} d="M39 15h18M40 33h16M36 51c8-4 17 4 25 0" />
      <path {...sketchStroke} d="M62 22h12M74 22l-7 22" />
      <path {...sketchStroke} d="M42 64h13" />
    </svg>
  );
}

function ProductSketch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="M25 35 48 21l23 14v27L48 76 25 62V35Z" />
      <path {...sketchStroke} d="m25 35 23 14 23-14M48 49v27" />
      <path {...sketchStroke} d="M36 28 59 42M59 28 36 42" />
      <path {...sketchStroke} d="M31 60c8 5 14 8 17 9" />
    </svg>
  );
}

export function DrinkIconView({
  icon,
  category,
  className,
}: {
  icon: DrinkIcon;
  category?: DrinkCategory;
  className?: string;
}) {
  if (category === "coffee" || icon === "coffee" || icon === "tea") {
    return <CoffeeSketch className={className} />;
  }
  if (category === "mocktail" || icon === "mocktail") {
    return <MocktailSketch className={className} />;
  }
  if (
    category === "soft" ||
    icon === "cup" ||
    icon === "bottle" ||
    icon === "water"
  ) {
    return <SoftDrinkSketch className={className} />;
  }
  if (
    category === "other" ||
    icon === "beer" ||
    icon === "wine" ||
    icon === "shot" ||
    icon === "other"
  ) {
    return <ProductSketch className={className} />;
  }
  return <CocktailSketch className={className} />;
}

export function NavCurrentIcon({ className }: IconProps) {
  return <CocktailSketch className={className} />;
}

export function NavHistoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="M27 18h42a5 5 0 0 1 5 5v52a5 5 0 0 1-5 5H27a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5Z" />
      <path {...sketchStroke} d="M35 13v13M61 13v13M22 34h52M34 49h25M34 62h17" />
    </svg>
  );
}

export function NavTemplateIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="m48 14 10 22 23 3-17 17 4 24-20-12-20 12 4-24-17-17 23-3 10-22Z" />
    </svg>
  );
}

export function NavSettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path {...sketchStroke} d="M48 32a16 16 0 1 1 0 32 16 16 0 0 1 0-32Z" />
      <path {...sketchStroke} d="M48 13v11M48 72v11M23 23l8 8M65 65l8 8M13 48h11M72 48h11M23 73l8-8M65 31l8-8" />
    </svg>
  );
}
