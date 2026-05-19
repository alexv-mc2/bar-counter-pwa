import type { DrinkCategory, DrinkIcon } from "@/lib/types";

type IconProps = {
  className?: string;
};

const ink = "#1C1917";
const line = {
  fill: "none",
  stroke: ink,
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function CocktailIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M18 15h60L50 50v25H38" fill="#FFF7ED" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M26 24h43L50 46H42L26 24Z" fill="#F97316" opacity="0.9" />
      <path d="M35 30c8 5 21 5 31 0" {...line} />
      <path d="M40 84h24" {...line} />
      <circle cx="72" cy="20" r="10" fill="#FACC15" stroke={ink} strokeWidth="2.4" />
      <path d="M67 16c5 2 8 5 10 9M61 22l20 9" {...line} />
      <path d="M50 50v25" {...line} />
    </svg>
  );
}

function MocktailIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M27 20h42l-6 58H33L27 20Z" fill="#ECFDF5" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M31 38c9-5 21 6 34 0l-4 34H36L31 38Z" fill="#34D399" opacity="0.85" />
      <path d="M39 58c8-16 19-20 30-16" {...line} />
      <path d="M55 44c-3-10 3-17 14-19 1 10-5 17-14 19Z" fill="#22C55E" stroke={ink} strokeWidth="2.2" />
      <circle cx="67" cy="25" r="8" fill="#F97316" stroke={ink} strokeWidth="2.2" />
      <path d="M36 48h2M48 67h2M58 56h2" {...line} />
    </svg>
  );
}

function CoffeeIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M23 38h43v22c0 10-8 18-18 18h-7c-10 0-18-8-18-18V38Z" fill="#F5E6D3" stroke={ink} strokeWidth="2.6" />
      <path d="M27 47c8 4 21 4 34 0v12c0 7-6 13-13 13h-7c-8 0-14-6-14-14V47Z" fill="#7C2D12" opacity="0.9" />
      <path d="M66 44h7c7 0 12 5 12 11s-5 11-12 11h-7" {...line} />
      <path d="M19 80h55" {...line} />
      <path d="M35 15c-5 6 5 9 0 15M49 15c-5 6 5 9 0 15M62 16c-4 5 4 8 0 13" {...line} />
      <path d="M35 47c7 3 15 3 22 0" stroke="#FFF7ED" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SoftDrinkIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M37 15h20l3 11-5 7 7 46H32l8-46-6-7 3-11Z" fill="#E0F2FE" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M39 35h18l5 32H34l5-32Z" fill="#38BDF8" opacity="0.78" />
      <path d="M38 15h19M39 33h17M36 52c8-4 17 4 25 0" {...line} />
      <path d="M62 22h13M75 22 66 49" {...line} />
      <circle cx="46" cy="64" r="2" fill={ink} />
      <circle cx="54" cy="58" r="2" fill={ink} />
    </svg>
  );
}

function BeerIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M26 30h39v45a7 7 0 0 1-7 7H33a7 7 0 0 1-7-7V30Z" fill="#FDE68A" stroke={ink} strokeWidth="2.6" />
      <path d="M65 42h8c6 0 10 5 10 12s-4 12-10 12h-8" {...line} />
      <path d="M33 31c-2-9 8-13 15-8 5-8 18-2 15 8" fill="#FFF7ED" stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M37 40v30M48 40v30M59 40v30" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WineIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M29 16h38v22c0 11-8 20-19 20s-19-9-19-20V16Z" fill="#FEF2F2" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M32 33c9 6 23 6 32 0v6c0 9-7 16-16 16s-16-7-16-16v-6Z" fill="#BE123C" opacity="0.9" />
      <path d="M48 58v20M37 83h22" {...line} />
      <path d="M34 26c8 4 20 4 28 0" stroke="#FCA5A5" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function TeaIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M21 42h44v17c0 11-9 20-20 20h-4c-11 0-20-9-20-20V42Z" fill="#ECFCCB" stroke={ink} strokeWidth="2.6" />
      <path d="M65 47h8c7 0 11 4 11 10s-4 10-11 10h-8" {...line} />
      <path d="M28 50c8 4 21 4 31 0v10c0 8-7 14-15 14h-3c-8 0-13-6-13-14V50Z" fill="#84CC16" opacity="0.7" />
      <path d="M19 81h55" {...line} />
      <path d="M37 17c-4 5 4 8 0 13M51 17c-4 5 4 8 0 13" {...line} />
      <path d="M58 31c-4-8 1-14 10-16 1 8-3 14-10 16Z" fill="#22C55E" stroke={ink} strokeWidth="2.2" />
    </svg>
  );
}

function ProductIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M26 34 48 21l22 13v28L48 75 26 62V34Z" fill="#F5F5F4" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="m26 34 22 14 22-14M48 48v27" {...line} />
      <path d="M36 28 59 42M59 28 36 42" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M31 60c8 5 14 8 17 9" {...line} />
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
  if (category === "coffee" || icon === "coffee") {
    return <CoffeeIllustration className={className} />;
  }
  if (category === "mocktail" || icon === "mocktail") {
    return <MocktailIllustration className={className} />;
  }
  if (category === "soft" || icon === "cup" || icon === "bottle" || icon === "water") {
    return <SoftDrinkIllustration className={className} />;
  }
  if (category === "beer" || icon === "beer") {
    return <BeerIllustration className={className} />;
  }
  if (category === "wine" || icon === "wine") {
    return <WineIllustration className={className} />;
  }
  if (category === "tea" || icon === "tea") {
    return <TeaIllustration className={className} />;
  }
  if (category === "other" || icon === "shot" || icon === "other") {
    return <ProductIllustration className={className} />;
  }
  return <CocktailIllustration className={className} />;
}

export function NavCurrentIcon({ className }: IconProps) {
  return <CocktailIllustration className={className} />;
}

export function NavHistoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M27 18h42a5 5 0 0 1 5 5v52a5 5 0 0 1-5 5H27a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5Z" fill="#FAFAF9" stroke={ink} strokeWidth="2.4" />
      <path d="M35 13v13M61 13v13M22 34h52M34 49h25M34 62h17" {...line} />
    </svg>
  );
}

export function NavTemplateIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="m48 14 10 22 23 3-17 17 4 24-20-12-20 12 4-24-17-17 23-3 10-22Z" fill="#FFF7ED" stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

export function NavSettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M48 32a16 16 0 1 1 0 32 16 16 0 0 1 0-32Z" fill="#FAFAF9" stroke={ink} strokeWidth="2.4" />
      <path d="M48 13v11M48 72v11M23 23l8 8M65 65l8 8M13 48h11M72 48h11M23 73l8-8M65 31l8-8" {...line} />
    </svg>
  );
}
