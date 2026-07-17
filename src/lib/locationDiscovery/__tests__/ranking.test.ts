import { describe, expect, it } from "vitest";
import { rankSunsetLocation } from "~/lib/locationDiscovery/ranking";
import type {
  HorizonProfile,
  SunsetLocationCandidate,
} from "~/lib/locationDiscovery/types";

// A neutral base candidate. Every keyword-derived signal is held CONSTANT so
// that differences in phase scores come ONLY from the terrain `viewProfiles`
// we vary per test — that isolates the clearance-gate / backdrop-lift logic.
function baseCandidate(
  viewProfiles?: SunsetLocationCandidate["viewProfiles"],
): SunsetLocationCandidate {
  return {
    id: "fixture",
    name: "Test Vantage",
    region: "vancouver-bc",
    kind: "viewpoint",
    latitude: 49.28,
    longitude: -123.12,
    sources: ["osm-overpass"],
    scenicTags: [],
    hasWaterView: false,
    hasElevation: false,
    publicAccess: true,
    photoReferenceCount: 0,
    references: [],
    viewProfiles,
  };
}

function eastProfile(profile: HorizonProfile): SunsetLocationCandidate["viewProfiles"] {
  return { east: profile };
}

describe("rankSunsetLocation — beltOfVenus reads the EAST horizon", () => {
  // Same backdrop & relief; only the near-horizon clearance GATE differs.
  const gatedEast = rankSunsetLocation(
    baseCandidate(eastProfile({ clearance: 0.2, backdrop: 0.8, relief: 0.5 })),
  );
  const openEast = rankSunsetLocation(
    baseCandidate(eastProfile({ clearance: 1.0, backdrop: 0.8, relief: 0.5 })),
  );
  // Clear near horizon but an empty (low-backdrop) distance.
  const emptyEast = rankSunsetLocation(
    baseCandidate(eastProfile({ clearance: 1.0, backdrop: 0.05, relief: 0.5 })),
  );
  // Near-fully-blocked near horizon: the gate should tank belt-of-Venus.
  const blockedEast = rankSunsetLocation(
    baseCandidate(eastProfile({ clearance: 0.01, backdrop: 0.8, relief: 0.5 })),
  );

  it("clearance acts as a GATE: a blocked east horizon scores lower on beltOfVenus than an open one", () => {
    // KEY invariant — pin the ordering exactly.
    expect(openEast.phaseScores.beltOfVenus).toBeGreaterThan(
      gatedEast.phaseScores.beltOfVenus,
    );
  });

  it("near-zero clearance tanks beltOfVenus below the open horizon by a wide margin", () => {
    expect(blockedEast.phaseScores.beltOfVenus).toBeLessThan(
      openEast.phaseScores.beltOfVenus,
    );
    // A blocked east means the anti-solar phenomenon is hidden — belt score
    // should collapse well under the open case (not a marginal difference).
    expect(openEast.phaseScores.beltOfVenus - blockedEast.phaseScores.beltOfVenus).toBeGreaterThan(
      25,
    );
  });

  it("backdrop DIFFERENTIATES: a clear horizon with distant relief beats an open-but-empty one", () => {
    expect(openEast.phaseScores.beltOfVenus).toBeGreaterThan(
      emptyEast.phaseScores.beltOfVenus,
    );
  });

  it("an open-but-empty east scores modestly (present but unremarkable)", () => {
    // clearance 1.0 keeps the gate open, but backdrop ~0 keeps it mid-range,
    // not a top-tier belt-of-Venus spot.
    expect(emptyEast.phaseScores.beltOfVenus).toBeGreaterThan(30);
    expect(emptyEast.phaseScores.beltOfVenus).toBeLessThan(70);
  });
});

describe("rankSunsetLocation — sunset phases read the WEST horizon", () => {
  const blockedWest = rankSunsetLocation(
    baseCandidate({ west: { clearance: 0.05, backdrop: 0.8, relief: 0.5 } }),
  );
  const openWest = rankSunsetLocation(
    baseCandidate({ west: { clearance: 1.0, backdrop: 0.8, relief: 0.5 } }),
  );

  it("a clear WEST horizon scores higher on sunDisk than a blocked one", () => {
    expect(openWest.phaseScores.sunDisk).toBeGreaterThan(
      blockedWest.phaseScores.sunDisk,
    );
  });

  it("the WEST profile does not drive beltOfVenus (that is the EAST's job)", () => {
    // With no east profile, both fall back to the SAME east keyword heuristic,
    // so belt-of-Venus is unaffected by the west clearance difference.
    expect(openWest.phaseScores.beltOfVenus).toBe(
      blockedWest.phaseScores.beltOfVenus,
    );
  });
});
