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
    iconWrap:
      "h-[clamp(3rem,8.5vh,5rem)] w-[clamp(3.5rem,9vw,6rem)] rounded-2xl",
    icon: "h-[clamp(3rem,8.25vh,5rem)] w-[clamp(3rem,8.25vh,5rem)]",
    name: "min-h-[2.4rem] text-[clamp(1rem,1.8vw,1.43rem)]",
    badge: "h-9 w-9 text-lg md:h-10 md:w-10 md:text-xl",
  },
  medium: {
    iconWrap:
      "h-[clamp(4.5rem,14vh,7rem)] w-[clamp(5rem,14vw,8rem)] rounded-[1.35rem]",
    icon: "h-[clamp(4.5rem,14vh,7rem)] w-[clamp(4.5rem,14vh,7rem)]",
    name: "min-h-[2.8rem] text-[clamp(1.3rem,2.45vw,1.95rem)]",
    badge: "h-11 w-11 text-xl md:h-12 md:w-12 md:text-2xl",
  },
  large: {
    iconWrap:
      "h-[clamp(5.5rem,20vh,9rem)] w-[clamp(6rem,18vw,10rem)] rounded-[1.6rem]",
    icon: "h-[clamp(5.5rem,20vh,9rem)] w-[clamp(5.5rem,20vh,9rem)]",
    name: "min-h-[3.25rem] text-[clamp(1.55rem,3vw,2.45rem)]",
    badge: "h-12 w-12 text-2xl md:h-14 md:w-14 md:text-3xl",
  },
};

export function DrinkGridButton({
  button,
  undoMode,
  serveMode,
  cardScale = "compact",
  onTap,
  onLongPress,
}: {
  button: DrinkButton;
  undoMode: boolean;
  serveMode: boolean;
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
        "group relative flex h-full min-h-0 select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] border border-red-200/70 bg-white/90 px-2 py-1.5 text-center sm:px-3 sm:py-2",
        "shadow-[0_3px_12px_rgba(120,53,15,0.10)] transition-all active:scale-[0.985] active:shadow-sm",
        undoMode && "ring-4 ring-dashed ring-red-500 ring-offset-2",
        serveMode && !undoMode && "ring-4 ring-emerald-500 ring-offset-2",
        !undoMode &&
          !serveMode &&
          "hover:border-red-300 hover:shadow-[0_8px_18px_rgba(120,53,15,0.12)]",
      ]
        .filter(Boolean)
        .join(" ")}
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
        className={`line-clamp-2 font-black leading-[1.05] text-stone-950 ${scale.name}`}
      >
        {button.name}
      </span>
      {button.pendingCount > 0 && (
        <span
          className={[
            "absolute right-2 top-2 flex items-center justify-center rounded-full font-black shadow-[0_4px_10px_rgba(185,28,28,0.30)]",
            palette.badge,
            scale.badge,
            "rbbc-queue-badge-active",
          ].join(" ")}
        >
          {button.pendingCount}
        </span>
      )}
    </button>
  );
}
