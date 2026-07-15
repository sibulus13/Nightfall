import { describe, expect, it } from "vitest";
import { bearingToCompass } from "~/lib/sunset/bearing";

// Pure, deterministic: a bearing in degrees maps to a fixed 16-point compass
// label. These pin the exact label format ("<POINT> (<deg>°)") AND the
// wraparound behaviour at the 0/360 seam and for negative inputs.
describe("bearingToCompass", () => {
  it.each([
    [0, "N (0°)"],
    [45, "NE (45°)"],
    [90, "E (90°)"],
    [126, "SE (126°)"], // the canonical example from the module doc-comment
    [180, "S (180°)"],
    [225, "SW (225°)"],
    [270, "W (270°)"],
    [315, "NW (315°)"],
  ])("maps %i° -> %s", (degrees, label) => {
    expect(bearingToCompass(degrees)).toBe(label);
  });

  it("wraps 360° back to due north", () => {
    expect(bearingToCompass(360)).toBe("N (0°)");
  });

  it("rounds the top of the rose (350°/359°) back to N without overflowing", () => {
    // 350/22.5 rounds to 16, which mod 16 must land on N (index 0).
    expect(bearingToCompass(350)).toBe("N (350°)");
    expect(bearingToCompass(359)).toBe("N (359°)");
  });

  it("normalizes negative bearings into [0,360)", () => {
    expect(bearingToCompass(-45)).toBe("NW (315°)");
    expect(bearingToCompass(-90)).toBe("W (270°)");
  });

  it("normalizes bearings beyond 360", () => {
    expect(bearingToCompass(486)).toBe("SE (126°)"); // 486 - 360 = 126
  });
});
