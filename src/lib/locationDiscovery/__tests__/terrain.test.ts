import { afterEach, describe, expect, it, vi } from "vitest";
import { enrichCandidatesWithTerrain } from "~/lib/locationDiscovery/terrain";
import type { SunsetLocationCandidate } from "~/lib/locationDiscovery/types";

// The terrain step samples elevation along the sunset (west) and anti-solar
// (east) bearings. For ONE candidate it emits 17 coordinates in this fixed
// order: [observer, west×8, east×8], where the 8 sample distances are
// [300, 600, 1200, 2500, 5000, 10000, 20000, 30000] m. Near band = <=3000 m
// (obstruction → hurts `clearance`); far band = >=5000 m (relief → `backdrop`).
//
// By stubbing `fetch` to return a fixed `{ elevation: [...] }` we exercise the
// terrain MATH with zero network — fully deterministic.

const OBSERVER = 0;
const WEST_NEAR = [1, 2, 3, 4]; // 300, 600, 1200, 2500 m
const WEST_FAR = [5, 6, 7, 8]; //  5000, 10000, 20000, 30000 m
const EAST_NEAR = [9, 10, 11, 12];
const EAST_FAR = [13, 14, 15, 16];

function candidate(): SunsetLocationCandidate {
  return {
    id: "terrain-fixture",
    name: "Synthetic Ridge",
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
  };
}

// Build the 17-element elevation array (observer at 0 m elevation) from a
// per-band elevation spec. Any index not set defaults to 0 (flat, sea level).
function elevations(spec: Partial<Record<number, number>>): number[] {
  const arr = new Array<number>(17).fill(0);
  arr[OBSERVER] = 0;
  for (const [index, value] of Object.entries(spec)) {
    arr[Number(index)] = value ?? 0;
  }
  return arr;
}

function stubElevationFetch(elevationArray: number[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => Promise.resolve({ elevation: elevationArray }),
      } as Response),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("enrichCandidatesWithTerrain (mocked fetch — no network)", () => {
  it("a blocked near-horizon yields LOW clearance", async () => {
    // Tall terrain (120 m) within the near band on both bearings → the
    // phenomenon is hidden → clearance collapses toward 0.
    const blocked = elevations(
      Object.fromEntries(
        [...WEST_NEAR, ...EAST_NEAR].map((i) => [i, 120] as const),
      ),
    );
    stubElevationFetch(blocked);

    const [enriched] = await enrichCandidatesWithTerrain([candidate()]);

    expect(enriched?.viewProfiles?.west?.clearance).toBeLessThan(0.1);
    expect(enriched?.viewProfiles?.east?.clearance).toBeLessThan(0.1);
  });

  it("a clear near-horizon with distant relief yields HIGH clearance and HIGH backdrop", async () => {
    // Near band flat (open sightline) but rising distant relief (200–500 m)
    // in the far band → clearance stays open, backdrop lifts.
    const distantRelief = elevations({
      [WEST_FAR[0]!]: 200,
      [WEST_FAR[1]!]: 300,
      [WEST_FAR[2]!]: 400,
      [WEST_FAR[3]!]: 500,
      [EAST_FAR[0]!]: 200,
      [EAST_FAR[1]!]: 300,
      [EAST_FAR[2]!]: 400,
      [EAST_FAR[3]!]: 500,
    });
    stubElevationFetch(distantRelief);

    const [enriched] = await enrichCandidatesWithTerrain([candidate()]);

    expect(enriched?.viewProfiles?.west?.clearance).toBeGreaterThan(0.9);
    expect(enriched?.viewProfiles?.west?.backdrop).toBeGreaterThan(0.5);
    // Relief (terrain std-dev in view) should also register as varied.
    expect(enriched?.viewProfiles?.west?.relief).toBeGreaterThan(0.3);
  });

  it("the blocked case backdrop stays low (nothing to compose against at distance)", async () => {
    const blocked = elevations(
      Object.fromEntries(
        [...WEST_NEAR, ...EAST_NEAR].map((i) => [i, 120] as const),
      ),
    );
    stubElevationFetch(blocked);

    const [enriched] = await enrichCandidatesWithTerrain([candidate()]);

    // Distant-relief fixture backdrop is high; the blocked/flat-far fixture is
    // near zero — the two are clearly separated.
    expect(enriched?.viewProfiles?.west?.backdrop).toBeLessThan(0.2);
  });

  it("degrades gracefully to no viewProfiles when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("network down"))),
    );

    const [enriched] = await enrichCandidatesWithTerrain([candidate()]);

    // Ranker falls back to keyword heuristics when terrain is absent.
    expect(enriched?.viewProfiles).toBeUndefined();
  });
});
