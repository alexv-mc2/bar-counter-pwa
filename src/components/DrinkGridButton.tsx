"use client";

import { useCallback, useRef } from "react";
import { DrinkIconView } from "@/lib/ui/icons";
import { COLOR_CLASSES } from "@/lib/ui/colors";
import type { DrinkButton } from "@/lib/types";

const LONG_PRESS_MS = 5000;
export type DrinkCardScale = "compact" | "medium" | "large";

const SCALE_CLASSES: Record<
  DrinkCardScale,
  { iconWrap: string; icon: string; name: string; badge: string }
> = {
  compact: {
    iconWrap: "h-20 w-24 rounded-2xl",
    icon: "h-20 w-20",
    name: "min-h-[2.15rem] text-base md:text-lg xl:text-xl",
    badge: "h-10 w-10 text-xl md:h-11 md:w-11 md:text-2xl",
  },
  medium: {
    iconWrap: "h-28 w-32 rounded-[1.35rem]",
    icon: "h-28 w-28",
    name: "min-h-[2.5rem] text-xl md:text-2xl",
    badge: "h-12 w-12 text-2xl",
  },
  large: {
    iconWrap: "h-36 w-40 rounded-[1.6rem]",
    icon: "h-36 w-36",
    name: "min-h-[3rem] text-2xl md:text-3xl",
    badge: "h-14 w-14 text-3xl",
  },
};

export function DrinkGridButton({
  button,
  undoMode,
  cardScale = "compact",
  onTap,
  onLongPress,
}: {
  button: DrinkButton;
  undoMode: boolean;
  cardScale?: DrinkCardScale;
  onTap: (buttonId: string) => void;
  onLongPress: (button: DrinkButton) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);
  const suppressClickRef = useRef(false);
  const palette = COLOR_CLASSES[button.color];
  const scale = SCALE_CLASSES[cardScale];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPress = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    longPressRef.current = false;
    suppressClickRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      suppressClickRef.current = true;
      onLongPress(button);
    }, LONG_PRESS_MS);
  };

  const endPress = () => {
    clearTimer();
  };

  const handleClick = () => {
    if (longPressRef.current || suppressClickRef.current) {
      longPressRef.current = false;
      suppressClickRef.current = false;
      return;
    }
    onTap(button.id);
  };

  return (
    <button
      type="button"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      className={[
        "group relative flex h-full min-h-0 select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] border border-red-200/70 bg-white/90 px-3 py-2 text-center",
        "shadow-[0_3px_12px_rgba(120,53,15,0.10)] transition-all active:scale-[0.985] active:shadow-sm",
        undoMode
          ? "ring-4 ring-dashed ring-red-500 ring-offset-2"
          : "hover:border-red-300 hover:shadow-[0_8px_18px_rgba(120,53,15,0.12)]",
      ].join(" ")}
    >
      <span className={`absolute left-0 top-0 h-1.5 w-full ${palette.accent}`} />
      <span
        className={`flex shrink-0 items-center justify-center bg-white/55 ${palette.soft} ${scale.iconWrap}`}
      >
        <DrinkIconView
          icon={button.icon}
          category={button.category}
          className={scale.icon}
        />
      </span>
      <span
        className={`line-clamp-2 font-black leading-tight text-stone-950 ${scale.name}`}
      >
        {button.name}
      </span>
      <span
        className={`absolute right-2 top-2 flex items-center justify-center rounded-full font-black shadow-[0_4px_10px_rgba(185,28,28,0.30)] ${palette.badge} ${scale.badge}`}
      >
        {button.count}
      </span>
    </button>
  );
}
