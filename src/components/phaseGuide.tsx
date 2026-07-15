import { Sun, Sunset, Sparkles, CloudSun, Moon } from "lucide-react";
import type { SunsetSpot } from "~/types/sunsetSpot";
import { bearingToCompass } from "~/lib/sunset/bearing";

type Phase = SunsetSpot["bestPhase"];

interface PhaseMeta {
  key: Phase;
  label: string;
  when: string;
  blurb: string;
  icon: typeof Sun;
  direction: "west" | "east" | null;
}

/** Chronological order of the sunset sequence — the layout follows real time. */
const PHASES: PhaseMeta[] = [
  {
    key: "goldenHour",
    label: "Golden hour",
    when: "≈1 hr before sunset",
    blurb: "Warm, low side-light that rakes across the scene. Face west.",
    icon: Sun,
    direction: "west",
  },
  {
    key: "sunDisk",
    label: "Sun disk",
    when: "at sunset",
    blurb: "The sun itself on the horizon — wants a clean, open western view.",
    icon: Sunset,
    direction: "west",
  },
  {
    key: "beltOfVenus",
    label: "Belt of Venus",
    when: "0–20 min after",
    blurb:
      "The pink band above the Earth's shadow, opposite the sun. Look east.",
    icon: Sparkles,
    direction: "east",
  },
  {
    key: "civilTwilight",
    label: "Civil twilight",
    when: "≈20 min after",
    blurb: "The sky's peak afterglow colour, overhead and all around.",
    icon: CloudSun,
    direction: null,
  },
  {
    key: "blueHour",
    label: "Blue hour",
    when: "30–50 min after",
    blurb: "Deep-blue calm — the moment for city lights and reflections.",
    icon: Moon,
    direction: null,
  },
];

interface BestSpot {
  spot: SunsetSpot;
  score: number;
}

function bestSpotForPhase(spots: SunsetSpot[], phase: Phase): BestSpot | null {
  let best: BestSpot | null = null;
  for (const spot of spots) {
    const score = spot.phaseScores[phase];
    if (best === null || score > best.score) {
      best = { spot, score };
    }
  }
  return best;
}

function bearingForPhase(spot: SunsetSpot, direction: PhaseMeta["direction"]) {
  if (direction === "west") {
    return bearingToCompass(spot.viewingDirections.sunsetAzimuthDegrees);
  }
  if (direction === "east") {
    return bearingToCompass(spot.viewingDirections.antisolarAzimuthDegrees);
  }
  return null;
}

export default function PhaseGuide({
  spots,
  selectedSpotId,
  onSelectSpot,
}: {
  spots: SunsetSpot[];
  selectedSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
}) {
  return (
    <section className="nf-panel p-4">
      <header className="mb-3">
        <div className="nf-section-label">The sunset, phase by phase</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Each phase peaks at a different time and wants a different horizon.
          Here&apos;s the best nearby spot for each.
        </p>
      </header>

      <ol className="space-y-1">
        {PHASES.map((phase, index) => {
          const best = bestSpotForPhase(spots, phase.key);
          const Icon = phase.icon;
          const isLast = index === PHASES.length - 1;
          const bearing = best
            ? bearingForPhase(best.spot, phase.direction)
            : null;
          const isSelected = best?.spot.id === selectedSpotId;

          return (
            <li key={phase.key} className="flex gap-3">
              {/* Timeline rail */}
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 text-white shadow-sm">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                {!isLast && (
                  <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />
                )}
              </div>

              {/* Phase content */}
              <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-base font-semibold text-foreground">
                    {phase.label}
                  </h4>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {phase.when}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                  {phase.blurb}
                </p>

                {best ? (
                  <button
                    type="button"
                    onClick={() => onSelectSpot(best.spot.id)}
                    className={`mt-2 flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-[#a6532d] bg-[#fff4e8] dark:bg-[#33241d]"
                        : "border-border bg-background/60 hover:bg-muted"
                    }`}
                    title={`Show ${best.spot.name} on the map`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {best.spot.name}
                      </span>
                      {bearing && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Look {bearing}
                        </span>
                      )}
                    </span>
                    <span className="nf-score shrink-0" title="Phase fit score">
                      {best.score}
                    </span>
                  </button>
                ) : (
                  <p className="mt-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    No spots scouted here yet.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
