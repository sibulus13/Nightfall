import type { SunsetSpot } from "~/types/sunsetSpot";

/**
 * Characteristic sky colour (rgb triplet) for each sunset phase, warm → cool.
 * Single source of truth for phase colouring across the phase guide and the
 * recommended-spots list. Keyed by the canonical `bestPhase` union so a new
 * phase can't be added without a colour.
 */
export const PHASE_COLORS: Record<SunsetSpot["bestPhase"], string> = {
  goldenHour: "251, 191, 36",
  sunDisk: "249, 115, 22",
  beltOfVenus: "244, 114, 182",
  civilTwilight: "167, 139, 250",
  blueHour: "96, 165, 250",
};

/**
 * A subtle single-phase gradient (low alpha) for tinting a card/row by the phase
 * it's best for — a hint of the visuals to expect. Kept legible over any card.
 */
export function phaseTintGradient(
  phase: SunsetSpot["bestPhase"],
  intensity = 0.14,
): string {
  const color = PHASE_COLORS[phase];
  return `linear-gradient(100deg, rgba(${color}, ${intensity}), rgba(${color}, ${
    intensity * 0.25
  }))`;
}
