import { describe, expect, it } from "vitest";
import {
  getSpotKey,
  getSpotTile,
  getSweepRadiusMeters,
  isProfileAzimuthStale,
} from "../spotStore";

describe("getSpotTile", () => {
  it("snaps nearby centers onto the same tile so panning reuses one sweep", () => {
    // ~1.5 km apart — the old 3-decimal cache key made these separate entries.
    const a = getSpotTile({ latitude: 49.2827, longitude: -123.1207 });
    const b = getSpotTile({ latitude: 49.2941, longitude: -123.1188 });

    expect(a.key).toBe(b.key);
  });

  it("separates centers that fall into different tiles", () => {
    const a = getSpotTile({ latitude: 49.28, longitude: -123.12 });
    const b = getSpotTile({ latitude: 49.41, longitude: -123.12 });

    expect(a.key).not.toBe(b.key);
  });

  // The sweep runs from tile.center and is padded by half a tile diagonal, so
  // the centroid — not the corner — is what keeps the whole tile covered.
  it("returns the tile centroid, never more than half a tile away", () => {
    const center = { latitude: 49.2827, longitude: -123.1207 };
    const tile = getSpotTile(center);

    expect(Math.abs(tile.center.latitude - center.latitude)).toBeLessThanOrEqual(
      0.025,
    );
    expect(
      Math.abs(tile.center.longitude - center.longitude),
    ).toBeLessThanOrEqual(0.025);
  });

  it("centers the tile the same way at negative coordinates", () => {
    const tile = getSpotTile({ latitude: -33.86, longitude: -151.2 });

    expect(Math.abs(tile.center.latitude - -33.86)).toBeLessThanOrEqual(0.025);
    expect(Math.abs(tile.center.longitude - -151.2)).toBeLessThanOrEqual(0.025);
  });
});

describe("getSweepRadiusMeters", () => {
  it("inflates the sweep so it covers the tile from any point inside it", () => {
    const requested = 12_000;
    const swept = getSweepRadiusMeters(requested);

    expect(swept).toBeGreaterThan(requested);
    // Half a tile diagonal is ~3.9 km at 0.05 deg; anything less would leave
    // corners of the tile uncovered and serve short results near the edge.
    expect(swept - requested).toBeGreaterThanOrEqual(3_900);
  });
});

describe("isProfileAzimuthStale", () => {
  it("treats a never-sampled profile as stale", () => {
    expect(isProfileAzimuthStale(null, 292)).toBe(true);
  });

  it("keeps profiles sampled at essentially today's sunset azimuth", () => {
    expect(isProfileAzimuthStale(292.4, 293.1)).toBe(false);
  });

  it("re-samples once the sunset has moved off the stored azimuth", () => {
    expect(isProfileAzimuthStale(292, 305)).toBe(true);
  });

  it("measures drift across the 0/360 wrap, not through it", () => {
    // 359 -> 2 deg is a 3 deg move, not 357.
    expect(isProfileAzimuthStale(359, 2)).toBe(false);
    expect(isProfileAzimuthStale(2, 359)).toBe(false);
  });
});

describe("getSpotKey", () => {
  it("collapses punctuation and precision noise onto one identity", () => {
    const a = getSpotKey(candidate("Jericho Beach Park", 49.27231, -123.19871));
    const b = getSpotKey(candidate("jericho beach park!", 49.27229, -123.19869));

    expect(a).toBe(b);
  });

  it("keeps distinct spots apart", () => {
    const a = getSpotKey(candidate("Jericho Beach Park", 49.2723, -123.1987));
    const b = getSpotKey(candidate("Spanish Banks", 49.2769, -123.2145));

    expect(a).not.toBe(b);
  });
});

function candidate(name: string, latitude: number, longitude: number) {
  return {
    id: name,
    name,
    region: "vancouver-bc" as const,
    kind: "beach" as const,
    latitude,
    longitude,
    sources: [],
    scenicTags: [],
    hasWaterView: true,
    hasElevation: false,
    publicAccess: true,
    photoReferenceCount: 0,
    references: [],
  };
}
