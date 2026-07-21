import { type CSSProperties } from "react";
import { Sun, Sunset, Sparkles, CloudSun, Moon } from "lucide-react";
import type { SunsetSpot } from "~/types/sunsetSpot";
import { PHASE_COLORS } from "~/lib/sunset/phaseColors";

export type Phase = SunsetSpot["bestPhase"];

interface PhaseMeta {
  key: Phase;
  label: string;
  when: string;
  blurb: string;
  icon: typeof Sun;
}

/** Chronological order of the sunset sequence — reads left → right as time. */
export const PHASES: PhaseMeta[] = [
  {
    key: "goldenHour",
    label: "Golden hour",
    when: "≈1 hr before",
    blurb: "Warm, low side-light that rakes across the scene. Face west.",
    icon: Sun,
  },
  {
    key: "sunDisk",
    label: "Sun disk",
    when: "at sunset",
    blurb: "The sun itself on the horizon — wants a clean, open western view.",
    icon: Sunset,
  },
  {
    key: "beltOfVenus",
    label: "Belt of Venus",
    when: "0–20 min after",
    blurb: "The pink band above the Earth's shadow, opposite the sun. Look east.",
    icon: Sparkles,
  },
  {
    key: "civilTwilight",
    label: "Civil twilight",
    when: "≈20 min after",
    blurb: "The sky's peak afterglow colour, overhead and all around.",
    icon: CloudSun,
  },
  {
    key: "blueHour",
    label: "Blue hour",
    when: "30–50 min after",
    blurb: "Deep-blue calm — the moment for city lights and reflections.",
    icon: Moon,
  },
];

// The coloration line reads left → right as time through the sunset sequence.
const PHASE_GRADIENT = `linear-gradient(90deg, ${PHASES.map(
  (phase, index) =>
    `rgb(${PHASE_COLORS[phase.key]}) ${Math.round(
      (index / (PHASES.length - 1)) * 100,
    )}%`,
).join(", ")})`;

/**
 * A linear timeline of the sunset sequence: a coloration line (the sky colour at
 * each phase) with the phase name + approximate time under it. Doubles as a
 * filter — tap a phase to spotlight the spots best for it on the map.
 */
export function PhaseTimeline({
  selectedPhase,
  onSelectPhase,
}: {
  selectedPhase: Phase | null;
  onSelectPhase: (phase: Phase) => void;
}) {
  return (
    <div>
      <div
        className="h-2 w-full rounded-full"
        style={{ backgroundImage: PHASE_GRADIENT }}
        aria-hidden="true"
      />
      <div className="mt-1.5 grid grid-cols-5 gap-1">
        {PHASES.map((phase) => {
          const Icon = phase.icon;
          const color = PHASE_COLORS[phase.key];
          const isSelected = selectedPhase === phase.key;
          return (
            <button
              key={phase.key}
              type="button"
              onClick={() => onSelectPhase(phase.key)}
              aria-pressed={isSelected}
              title={phase.blurb}
              style={
                {
                  "--pc": `rgb(${color})`,
                  "--pcf": `rgba(${color}, 0.16)`,
                  "--pch": `rgba(${color}, 0.09)`,
                  borderColor: isSelected ? `rgb(${color})` : "transparent",
                  backgroundColor: isSelected ? `rgba(${color}, 0.16)` : undefined,
                } as CSSProperties
              }
              className={`group flex flex-col items-center gap-0.5 rounded-md border px-0.5 py-1 text-center transition-all duration-150 hover:-translate-y-px hover:bg-[color:var(--pch)] hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc)] focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                isSelected ? "scale-105 shadow-sm" : ""
              }`}
            >
              <Icon
                className="h-3.5 w-3.5 transition-transform group-hover:scale-110"
                style={{ color: `rgb(${color})` }}
                aria-hidden="true"
              />
              <span className="text-[10px] font-semibold leading-tight">
                {phase.label}
              </span>
              <span className="text-[9px] leading-tight text-muted-foreground">
                {phase.when}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
