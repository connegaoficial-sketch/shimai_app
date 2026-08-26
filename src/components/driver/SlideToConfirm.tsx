"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const THUMB_SIZE_PX = 56;
const TRACK_INSET_PX = 4;
const CONFIRM_RATIO = 0.82;

type SlideToConfirmProps = {
  label: string;
  completedLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  pending?: boolean;
  completed?: boolean;
  variant?: "gold" | "sakura";
};

export function SlideToConfirm({
  label,
  completedLabel = "Confirmado",
  onConfirm,
  disabled = false,
  pending = false,
  completed = false,
  variant = "gold",
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);
  const [confirmed, setConfirmed] = useState(completed);
  const startXRef = useRef(0);
  const maxOffsetRef = useRef(0);
  const confirmingRef = useRef(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    maxOffsetRef.current = Math.max(
      0,
      track.clientWidth - THUMB_SIZE_PX - TRACK_INSET_PX * 2,
    );
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    setConfirmed(completed);
    if (completed) {
      measure();
      setOffsetPx(maxOffsetRef.current);
    } else if (!pending) {
      setOffsetPx(0);
    }
  }, [completed, pending, measure]);

  const runConfirm = useCallback(async () => {
    if (confirmingRef.current || confirmed || disabled || pending) return;
    confirmingRef.current = true;
    try {
      await onConfirm();
      measure();
      setOffsetPx(maxOffsetRef.current);
      setConfirmed(true);
    } catch {
      setOffsetPx(0);
      setConfirmed(false);
    } finally {
      confirmingRef.current = false;
    }
  }, [confirmed, disabled, measure, onConfirm, pending]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || pending || confirmed) return;
    measure();
    setDragging(true);
    startXRef.current = event.clientX - offsetPx;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || confirmed) return;
    const next = Math.min(
      maxOffsetRef.current,
      Math.max(0, event.clientX - startXRef.current),
    );
    setOffsetPx(next);
    if (next >= maxOffsetRef.current * CONFIRM_RATIO) {
      setDragging(false);
      void runConfirm();
    }
  }

  function onPointerUp() {
    if (!dragging || confirmed) return;
    setDragging(false);
    if (offsetPx >= maxOffsetRef.current * CONFIRM_RATIO) {
      void runConfirm();
      return;
    }
    setOffsetPx(0);
  }

  const isDone = confirmed || completed;
  const progress =
    maxOffsetRef.current > 0 ? offsetPx / maxOffsetRef.current : 0;

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-16 select-none overflow-hidden rounded-full border",
        variant === "sakura"
          ? "border-shimai-sakura/35 bg-shimai-sakura/10"
          : "border-shimai-gold/35 bg-shimai-gold/10",
        (disabled || pending) && "opacity-60",
      )}
      aria-disabled={disabled || pending || isDone}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center px-[4.5rem] font-sans text-sm font-medium transition-opacity duration-150",
          variant === "sakura" ? "text-shimai-sakura" : "text-shimai-gold",
          isDone ? "opacity-100" : "opacity-80",
        )}
        style={{ opacity: isDone ? 1 : Math.max(0.25, 1 - progress * 1.4) }}
      >
        {isDone ? completedLabel : pending ? "Procesando…" : label}
      </div>

      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label={label}
        tabIndex={disabled || isDone ? -1 : 0}
        onKeyDown={(event) => {
          if (disabled || pending || isDone) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void runConfirm();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "absolute top-1 z-10 flex touch-none items-center justify-center rounded-full shadow-lg transition-[left,transform] duration-150 ease-out",
          dragging ? "cursor-grabbing" : "cursor-grab",
          variant === "sakura"
            ? "bg-shimai-sakura text-shimai-black"
            : "bg-shimai-gold text-shimai-black",
          isDone && "pointer-events-none",
        )}
        style={{
          left: TRACK_INSET_PX + offsetPx,
          width: THUMB_SIZE_PX,
          height: THUMB_SIZE_PX,
          transition: dragging ? "none" : undefined,
        }}
      >
        {isDone ? (
          <span className="font-sans text-lg font-bold" aria-hidden>
            ✓
          </span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M5 12h12" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        )}
      </div>
    </div>
  );
}
