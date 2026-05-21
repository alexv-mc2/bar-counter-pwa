"use client";

import { useCallback, useEffect, useRef } from "react";
import { DrinkIconView } from "@/lib/ui/icons";
import { COLOR_CLASSES } from "@/lib/ui/colors";
import type { DrinkButton } from "@/lib/types";

const LONG_PRESS_MS = 3000;
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

function useReliableLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLButtonElement | null>(null);
  const longPressFiredRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const releasePointerCapture = useCallback(() => {
    const target = targetRef.current;
    const pointerId = pointerIdRef.current;
    if (!target || pointerId === null) return;
    try {
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // Some mobile browsers can drop capture while opening a modal.
    }
  }, []);

  const resetState = useCallback(() => {
    clearTimer();
    clearResetTimer();
    releasePointerCapture();
    pointerIdRef.current = null;
    targetRef.current = null;
    longPressFiredRef.current = false;
    suppressNextClickRef.current = false;
  }, [clearResetTimer, clearTimer, releasePointerCapture]);

  const scheduleSuppressionReset = useCallback(() => {
    clearResetTimer();
    resetTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = false;
      suppressNextClickRef.current = false;
      pointerIdRef.current = null;
      targetRef.current = null;
      resetTimerRef.current = null;
    }, 700);
  }, [clearResetTimer]);

  const finishPress = useCallback(
    (keepClickSuppression: boolean) => {
      clearTimer();
      releasePointerCapture();
      pointerIdRef.current = null;
      targetRef.current = null;

      if (keepClickSuppression) {
        scheduleSuppressionReset();
        return;
      }

      clearResetTimer();
      longPressFiredRef.current = false;
      suppressNextClickRef.current = false;
    },
    [clearResetTimer, clearTimer, releasePointerCapture, scheduleSuppressionReset],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.pointerType !== "mouse" && !event.isPrimary) return;

      resetState();
      pointerIdRef.current = event.pointerId;
      targetRef.current = event.currentTarget;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort on older tablet browsers.
      }

      timerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        suppressNextClickRef.current = true;
        releasePointerCapture();
        onLongPress();
        scheduleSuppressionReset();
      }, LONG_PRESS_MS);
    },
    [onLongPress, releasePointerCapture, resetState, scheduleSuppressionReset],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) {
        return;
      }
      finishPress(longPressFiredRef.current);
    },
    [finishPress],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (longPressFiredRef.current || suppressNextClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
        resetState();
        return false;
      }

      resetState();
      return true;
    },
    [resetState],
  );

  useEffect(() => resetState, [resetState]);

  return {
    handleClick,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onLostPointerCapture: handlePointerEnd,
      onBlur: () => finishPress(longPressFiredRef.current),
      onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
      },
    },
  };
}

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
  const palette = COLOR_CLASSES[button.color];
  const scale = SCALE_CLASSES[cardScale];
  const { handleClick: handleLongPressClick, pointerHandlers } = useReliableLongPress(
    () => onLongPress(button),
  );

  const handleClick = () => {
    onTap(button.id);
  };

  return (
    <button
      type="button"
      {...pointerHandlers}
      onClick={(event) => {
        if (!handleLongPressClick(event)) return;
        handleClick();
      }}
      className={[
        "rbbc-product-card group relative flex h-full min-h-0 select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] border border-red-200/70 bg-white/90 px-2 py-1.5 text-center sm:px-3 sm:py-2",
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

export function AddProductButton({
  cardScale = "compact",
  label,
  hint,
  onLongPress,
}: {
  cardScale?: DrinkCardScale;
  label: string;
  hint: string;
  onLongPress: () => void;
}) {
  const scale = SCALE_CLASSES[cardScale];
  const { handleClick, pointerHandlers } = useReliableLongPress(onLongPress);

  return (
    <button
      type="button"
      data-add-product-button="true"
      {...pointerHandlers}
      onClick={handleClick}
      className="relative flex h-full min-h-0 select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] border-2 border-dashed border-stone-300/80 bg-white/45 px-2 py-1.5 text-center text-stone-400 shadow-[0_3px_10px_rgba(120,53,15,0.05)] active:scale-[0.985] active:bg-stone-50 sm:px-3 sm:py-2"
      aria-label={label}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-2xl border border-stone-200/80 bg-stone-50/80 ${scale.iconWrap}`}
      >
        <span className="text-[clamp(2.5rem,7vh,4.75rem)] font-black leading-none text-stone-300">
          +
        </span>
      </span>
      <span
        className={`line-clamp-2 font-black leading-[1.05] text-stone-400 ${scale.name}`}
      >
        {label}
      </span>
      <span className="sr-only">{hint}</span>
    </button>
  );
}
