"use client";

import { useCallback, useRef } from "react";
import { DrinkIconView } from "@/lib/ui/icons";
import { COLOR_CLASSES } from "@/lib/ui/colors";
import type { DrinkButton } from "@/lib/types";

const LONG_PRESS_MS = 5000;

export function DrinkGridButton({
  button,
  undoMode,
  onTap,
  onLongPress,
}: {
  button: DrinkButton;
  undoMode: boolean;
  onTap: (buttonId: string) => void;
  onLongPress: (button: DrinkButton) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);
  const suppressClickRef = useRef(false);
  const palette = COLOR_CLASSES[button.color];

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
        "group relative flex min-h-[132px] select-none flex-col items-center justify-center overflow-hidden rounded-[18px] border border-red-200/70 bg-white/90 px-3 pb-3 pt-4 text-center",
        "shadow-[0_3px_12px_rgba(120,53,15,0.10)] transition-all active:scale-[0.985] active:shadow-sm md:min-h-[142px] xl:min-h-[150px]",
        undoMode
          ? "ring-4 ring-dashed ring-red-500 ring-offset-2"
          : "hover:border-red-300 hover:shadow-[0_8px_18px_rgba(120,53,15,0.12)]",
      ].join(" ")}
    >
      <span className={`absolute left-0 top-0 h-1.5 w-full ${palette.accent}`} />
      <span className={`mb-1 flex h-16 w-20 items-center justify-center rounded-2xl ${palette.soft}`}>
        <DrinkIconView
          icon={button.icon}
          category={button.category}
          className="h-14 w-14 text-stone-950"
        />
      </span>
      <span className="line-clamp-2 min-h-[2.35rem] text-[1.05rem] font-black leading-tight text-stone-950 md:text-lg xl:text-xl">
        {button.name}
      </span>
      <span
        className={`absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl font-black shadow-[0_4px_10px_rgba(185,28,28,0.30)] ${palette.badge}`}
      >
        {button.count}
      </span>
    </button>
  );
}
