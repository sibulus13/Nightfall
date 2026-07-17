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
 * The ONE standardized card wash, used everywhere a spot is shown (phase guide +
 * recommended list). A faint BASE of the spot's phase colour on the left sweeps
 * into a stronger HIGHLIGHT on the right. The grammar is identical on every card
 * — only the hue (the spot's best phase) and vividness (its score, if given)
 * vary — so the same spot reads as the same colour across surfaces.
 */
export function phaseCardGradient(
  phase: SunsetSpot["bestPhase"],
  score?: number,
): string {
  const color = PHASE_COLORS[phase];
  const highlight = 0.12 + (score !== undefined ? (score / 100) * 0.12 : 0.06);
  return `linear-gradient(100deg, rgba(${color}, 0.04) 0%, rgba(${color}, ${highlight}) 100%)`;
}
