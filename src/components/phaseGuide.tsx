import { Sun, Sunset, Sparkles, CloudSun, Moon, Loader2 } from "lucide-react";
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

/** Chronological order of the sunset sequence — the strip reads left → right as time. */
const PHASES: PhaseMeta[] = [
  {
    key: "goldenHour",
    label: "Golden hour",
    when: "≈1 hr before",
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
    blurb: "The pink band above the Earth's shadow, opposite the sun. Look east.",
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
  isLoading = false,
  isRefining = false,
}: {
  spots: SunsetSpot[];
  selectedSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
  isLoading?: boolean;
  isRefining?: boolean;
}) {
  return (
    <section className="nf-panel p-3">
      <header className="mb-3">
        <div className="flex items-center gap-2">
          <div className="nf-section-label">The sunset, phase by phase</div>
          {isRefining && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              refining with terrain…
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Each phase peaks at a different time and wants a different horizon —
          here&apos;s the best nearby spot for each, in order.
        </p>
      </header>

      {isLoading && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding the best sunset spots nearby…
          </div>
          <div className="nf-sunset-band animate-pulse" aria-hidden="true" />
        </div>
      )}
      {isLoading && spots.length === 0 ? (
        <PhaseGuideSkeleton />
      ) : (
      <ol
        className={`flex flex-col gap-2 transition-opacity ${
          isLoading ? "opacity-50" : ""
        }`}
      >
        {PHASES.map((phase) => {
          const best = bestSpotForPhase(spots, phase.key);
          const Icon = phase.icon;
          const bearing = best
            ? bearingForPhase(best.spot, phase.direction)
            : null;
          const isSelected = best?.spot.id === selectedSpotId;

          return (
            <li
              key={phase.key}
              className="rounded-md border border-border bg-background/50 p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 text-white shadow-sm">
                  <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                </span>
                <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {phase.label}
                </h4>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {phase.when}
                </span>
              </div>

              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {phase.blurb}
              </p>

              <div className="mt-2">
                {best ? (
                  <button
                    type="button"
                    onClick={() => onSelectSpot(best.spot.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                      isSelected
                        ? "border-[#a6532d] bg-[#fff4e8] dark:bg-[#33241d]"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                    title={`Show ${best.spot.name} on the map`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {best.spot.name}
                      </span>
                      {bearing && (
                        <span className="block text-xs text-muted-foreground">
                          Look {bearing}
                        </span>
                      )}
                    </span>
                    <span className="nf-score shrink-0" title="Phase fit score">
                      {best.score}
                    </span>
                  </button>
                ) : (
                  <p className="rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground">
                    No spots scouted yet.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      )}
    </section>
  );
}

/** Placeholder cards shown on a cold search, before the fast first paint lands. */
function PhaseGuideSkeleton() {
  return (
    <ol className="flex flex-col gap-2" aria-hidden="true">
      {PHASES.map((phase) => (
        <li
          key={phase.key}
          className="flex flex-col gap-2 rounded-md border border-border bg-background/50 p-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
            <span className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <span className="h-3 w-full animate-pulse rounded bg-muted" />
          <span className="h-8 w-full animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ol>
  );
}
