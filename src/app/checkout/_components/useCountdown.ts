"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckoutStatus } from "./types";

export function useCountdown(
  expiresAt: string | null,
  status: CheckoutStatus,
  onExpired: () => void
) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtMs = useRef(expiresAt ? new Date(expiresAt).getTime() : 0);

  // Initialize from URL param
  useEffect(() => {
    if (expiresAt) {
      const ms = new Date(expiresAt).getTime();
      expiresAtMs.current = ms;
      setSecondsLeft(Math.max(0, Math.floor((ms - Date.now()) / 1000)));
    }
  }, [expiresAt]);

  // Tick
  useEffect(() => {
    if (status !== "reserved" && status !== "paying") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAtMs.current - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        if (status === "reserved") onExpired();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, onExpired]);

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return { secondsLeft, stop };
}

export function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
