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
        "relative flex min-h-[130px] select-none flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 text-center",
        "shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition-all active:scale-[0.97] active:shadow-sm",
        undoMode
          ? "ring-2 ring-dashed ring-red-500 ring-offset-1"
          : "ring-1 ring-stone-200/80",
      ].join(" ")}
    >
      <DrinkIconView icon={button.icon} className="h-9 w-9 text-stone-600" />
      <span className="line-clamp-2 text-sm font-bold leading-tight text-stone-900">
        {button.name}
      </span>
      <span className={`h-1 w-10 rounded-full opacity-50 ${palette.categoryDot}`} />
      <span
        className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${palette.badge}`}
      >
        {button.count}
      </span>
    </button>
  );
}
