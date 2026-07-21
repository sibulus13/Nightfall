"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Interactive loading indicator that cycles through short, on-brand phrases
 * while a long async task runs — so a multi-second discovery/AI call reads as
 * "actively working" rather than "hung". Respects reduced motion (holds the
 * first phrase) and announces a single "Loading" to assistive tech rather than
 * spamming each phrase.
 */

// Sunset/scouting-themed phrases for the spot-discovery flow.
export const SCOUTING_MESSAGES = [
  "Scouting horizons",
  "Reading the clouds",
  "Chasing the light",
  "Checking the western sky",
  "Finding vantage points",
  "Weighing the haze",
  "Ranking the viewpoints",
];

const DEFAULT_INTERVAL_MS = 2000;

interface CyclingLoaderProps {
  messages?: string[];
  intervalMs?: number;
  className?: string;
  iconClassName?: string;
}

export default function CyclingLoader({
  messages = SCOUTING_MESSAGES,
  intervalMs = DEFAULT_INTERVAL_MS,
  className = "",
  iconClassName = "h-4 w-4",
}: CyclingLoaderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reduced motion: don't cycle — hold the first phrase.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex items-center gap-2 text-sm font-medium text-muted-foreground ${className}`}
    >
      <Loader2 className={`animate-spin ${iconClassName}`} aria-hidden="true" />
      {/* key remounts the span each cycle so the fade replays */}
      <span
        key={index}
        aria-hidden="true"
        className="animate-in fade-in-0 duration-500 motion-reduce:animate-none"
      >
        {messages[index]}…
      </span>
    </div>
  );
}
