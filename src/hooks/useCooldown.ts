"use client";

import { useEffect, useState, useCallback } from "react";

const COOLDOWN_KEY = "waterlooplace_last_pixel_time";

export function useCooldown(cooldownSeconds: number) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Check cooldown on mount and update
  const checkCooldown = useCallback(() => {
    const lastPixelTime = localStorage.getItem(COOLDOWN_KEY);
    if (!lastPixelTime) {
      setRemainingSeconds(0);
      return;
    }

    const elapsed = Math.floor((Date.now() - parseInt(lastPixelTime)) / 1000);
    const remaining = Math.max(0, cooldownSeconds - elapsed);
    setRemainingSeconds(remaining);
  }, [cooldownSeconds]);

  // Start cooldown after placing a pixel
  const startCooldown = useCallback(() => {
    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    setRemainingSeconds(cooldownSeconds);
  }, [cooldownSeconds]);

  // Check on mount
  useEffect(() => {
    checkCooldown();
  }, [checkCooldown]);

  // Countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  return {
    remainingSeconds,
    isOnCooldown: remainingSeconds > 0,
    startCooldown,
    checkCooldown,
  };
}
