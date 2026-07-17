import { useState } from "react";
import {
  Sun,
  Sunset,
  Sparkles,
  CloudSun,
  Moon,
  Loader2,
  ChevronDown,
} from "lucide-react";
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

interface SpotGroup {
  spot: SunsetSpot;
  entries: { phase: PhaseMeta; score: number }[];
  topScore: number;
}

/**
 * Group the phases by their best spot, so a location that wins several phases
 * shows as ONE card listing them — instead of the same spot repeated per phase.
 * Cards keep chronological order (the group is ordered by its earliest phase).
 */
function groupPhasesBySpot(spots: SunsetSpot[]): SpotGroup[] {
  const groups = new Map<string, SpotGroup>();
  const order: string[] = [];

  for (const phase of PHASES) {
    const best = bestSpotForPhase(spots, phase.key);
    if (!best) {
      continue;
    }
    const existing = groups.get(best.spot.id);
    if (existing) {
      existing.entries.push({ phase, score: best.score });
      existing.topScore = Math.max(existing.topScore, best.score);
    } else {
      groups.set(best.spot.id, {
        spot: best.spot,
        entries: [{ phase, score: best.score }],
        topScore: best.score,
      });
      order.push(best.spot.id);
    }
  }

  return order.map((id) => groups.get(id)!);
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
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const toggleExpanded = (key: string) =>
    setExpandedPhases((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const spotGroups = groupPhasesBySpot(spots);

  return (
    <section className="nf-panel p-3">
      <header className="mb-3">
        <div className="flex items-center gap-2">
          <div className="nf-section-label">Best sunset spots nearby</div>
          {isRefining && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              refining with terrain…
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Which sunset phases each nearby spot is best for. Tap a spot to show it
          on the map, or the arrow for details.
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
        {spotGroups.map((group) => {
          const Icon = group.entries[0]!.phase.icon;
          const isSelected = group.spot.id === selectedSpotId;
          const isExpanded = expandedPhases.has(group.spot.id);
          const phaseSummary = group.entries
            .map((entry) => entry.phase.label)
            .join(" · ");

          return (
            <li
              key={group.spot.id}
              className={`overflow-hidden rounded-md border bg-background/50 ${
                isSelected ? "border-[#a6532d]" : "border-border"
              }`}
            >
              <div className="flex items-center gap-1.5 p-2">
                {/* Whole row shows this spot on the map */}
                <button
                  type="button"
                  onClick={() => onSelectSpot(group.spot.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  title={`Show ${group.spot.name} on the map`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 text-white shadow-sm">
                    <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {group.spot.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {phaseSummary}
                    </span>
                  </span>
                </button>
                <span className="nf-score shrink-0" title="Best phase-fit score">
                  {group.topScore}
                </span>
                <button
                  type="button"
                  onClick={() => toggleExpanded(group.spot.id)}
                  className="nf-icon-button h-7 w-7 shrink-0"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Hide" : "Show"} ${group.spot.name} details`}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {isExpanded && (
                <ul className="border-t border-border">
                  {group.entries.map((entry) => {
                    const bearing = bearingForPhase(
                      group.spot,
                      entry.phase.direction,
                    );
                    return (
                      <li
                        key={entry.phase.key}
                        className="border-b border-border/60 px-2.5 py-2 text-xs leading-snug text-muted-foreground last:border-b-0"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {entry.phase.label}
                          </span>
                          <span className="shrink-0">
                            {entry.phase.when}
                            {bearing ? ` · Look ${bearing}` : ""}
                          </span>
                        </div>
                        <p className="mt-0.5">{entry.phase.blurb}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {spotGroups.length === 0 && !isLoading && (
          <li className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No spots scouted here yet.
          </li>
        )}
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
          className="flex items-center gap-2 rounded-md border border-border bg-background/50 p-2"
        >
          <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
          <span className="h-4 w-20 shrink-0 animate-pulse rounded bg-muted" />
          <span className="h-3 flex-1 animate-pulse rounded bg-muted" />
          <span className="h-7 w-9 shrink-0 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ol>
  );
}
