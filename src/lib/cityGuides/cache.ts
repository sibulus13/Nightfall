import type { CityGuide } from "~/types/cityGuide";
import { getNeonSql, hasNeonDatabase } from "~/lib/neon/client";
import { ensureNeonAppSchema } from "~/lib/neon/schema";

const CITY_GUIDE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CITY_GUIDE_CACHE_KEY_PREFIX = "city-guide-v1";

const cityGuideCache = new Map<string, CityGuide>();

export function getCityGuideCacheKey(location: {
  cityName: string;
  latitude: number;
  longitude: number;
}): string {
  return [
    CITY_GUIDE_CACHE_KEY_PREFIX,
    normalizeCitySlug(location.cityName),
    location.latitude.toFixed(2),
    location.longitude.toFixed(2),
  ].join(":");
}

export async function getCachedCityGuide(
  cacheKey: string,
): Promise<CityGuide | null> {
  const neonGuide = await getCachedNeonCityGuide(cacheKey);

  if (neonGuide) {
    return neonGuide;
  }

  const cachedGuide = cityGuideCache.get(cacheKey);

  if (!cachedGuide) {
    return null;
  }

  if (new Date(cachedGuide.expiresAt).getTime() <= Date.now()) {
    cityGuideCache.delete(cacheKey);
    return null;
  }

  return {
    ...cachedGuide,
    source: "cache",
    cacheStatus: "hit",
  };
}

export async function setCachedCityGuide(
  cacheKey: string,
  guide: CityGuide,
): Promise<void> {
  cityGuideCache.set(cacheKey, guide);

  if (!hasNeonDatabase()) {
    return;
  }

  await ensureNeonAppSchema();

  const sql = getNeonSql();

  await sql`
    insert into city_guides (
      cache_key,
      city_name,
      latitude,
      longitude,
      guide_json,
      provider,
      generated_at,
      expires_at,
      updated_at
    )
    values (
      ${cacheKey},
      ${guide.cityName},
      ${guide.latitude},
      ${guide.longitude},
      ${JSON.stringify(guide)},
      ${guide.source},
      ${guide.generatedAt},
      ${guide.expiresAt},
      ${new Date().toISOString()}
    )
    on conflict (cache_key) do update
    set guide_json = excluded.guide_json,
        provider = excluded.provider,
        generated_at = excluded.generated_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
  `;
}

export function getCityGuideExpiryDate(): Date {
  return new Date(Date.now() + CITY_GUIDE_CACHE_TTL_MS);
}

function normalizeCitySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function getCachedNeonCityGuide(cacheKey: string): Promise<CityGuide | null> {
  if (!hasNeonDatabase()) {
    return null;
  }

  await ensureNeonAppSchema();

  const sql = getNeonSql();
  const rows = await sql`
    select guide_json
    from city_guides
    where cache_key = ${cacheKey}
      and expires_at > now()
    limit 1
  ` as Array<{ guide_json: unknown }>;
  const guideJson = rows[0]?.guide_json;

  if (!guideJson) {
    return null;
  }

  const guide =
    typeof guideJson === "string"
      ? (JSON.parse(guideJson) as CityGuide)
      : (guideJson as CityGuide);

  return {
    ...guide,
    source: "cache",
    cacheStatus: "hit",
  };
}
