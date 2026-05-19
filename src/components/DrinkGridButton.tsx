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
  const firedRef = useRef(false);
  const palette = COLOR_CLASSES[button.color];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPress = () => {
    firedRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress(button);
    }, LONG_PRESS_MS);
  };

  const endPress = () => {
    clearTimer();
  };

  const handleClick = () => {
    if (firedRef.current) {
      firedRef.current = false;
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
      className={`relative flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center text-white shadow-lg ring-2 ${palette.bg} ${palette.ring} ${undoMode ? "outline outline-4 outline-dashed outline-amber-200" : ""} active:scale-[0.98]`}
    >
      <DrinkIconView icon={button.icon} className="h-8 w-8" />
      <span className="line-clamp-2 text-sm font-bold leading-tight sm:text-base">
        {button.name}
      </span>
      <span
        className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${palette.badge}`}
      >
        {button.count}
      </span>
    </button>
  );
}
