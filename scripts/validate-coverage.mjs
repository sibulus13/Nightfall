#!/usr/bin/env node
// Live global-coverage smoke for the sunset-spots API.
//
// HEALTH CHECK — NOT the deterministic gate. It hits a running dev server
// which in turn calls live third-party services (OSM Overpass, Open-Meteo),
// so results are inherently non-deterministic and rate-limit sensitive. Use it
// to confirm the discovery pipeline returns >=1 candidate for a spread of
// global cities; do NOT wire it into a blocking CI gate.
//
// Usage:  node scripts/validate-coverage.mjs
//         PORT=3000 node scripts/validate-coverage.mjs
// Requires a server already running (e.g. `npm run dev`) on that port.

const PORT = process.env.PORT ?? "3001";
const BASE = `http://localhost:${PORT}`;
const ENDPOINT = "/api/locations/sunset-spots";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2500;
const SPACING_MS = 3000; // between cities, to avoid upstream rate-limits
const REQUEST_TIMEOUT_MS = 30_000;

// The gate city list — a global spread so coverage isn't just the home region.
const CITIES = [
  { name: "Vancouver", country: "CA", lat: 49.2827, lon: -123.1207 },
  { name: "Surrey", country: "CA", lat: 49.1913, lon: -122.849 },
  { name: "Seattle", country: "US", lat: 47.6062, lon: -122.3321 },
  { name: "Toronto", country: "CA", lat: 43.6532, lon: -79.3832 },
  { name: "London", country: "UK", lat: 51.5074, lon: -0.1278 },
  { name: "Sydney", country: "AU", lat: -33.8688, lon: 151.2093 },
  { name: "Tokyo", country: "JP", lat: 35.6762, lon: 139.6503 },
  { name: "Cape Town", country: "ZA", lat: -33.9249, lon: 18.4241 },
  { name: "Rio", country: "BR", lat: -22.9068, lon: -43.1729 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCandidateCount(city) {
  const url = `${BASE}${ENDPOINT}?lat=${city.lat}&lon=${city.lon}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const count = Array.isArray(data?.candidates) ? data.candidates.length : 0;
    return { ok: count >= 1, count, error: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkCity(city) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await fetchCandidateCount(city);
      if (result.ok) {
        return { ...result, attempts: attempt };
      }
      lastError = `only ${result.count} candidate(s)`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS);
    }
  }
  return { ok: false, count: 0, error: lastError, attempts: MAX_ATTEMPTS };
}

function pad(value, width) {
  return String(value).padEnd(width);
}

async function main() {
  console.log(`Live coverage smoke -> ${BASE}${ENDPOINT}`);
  console.log("(health check — depends on live third-party APIs, non-deterministic)\n");

  const rows = [];
  for (const city of CITIES) {
    const result = await checkCity(city);
    rows.push({ city, result });
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.ok
      ? `${result.count} candidate(s) in ${result.attempts} attempt(s)`
      : `${result.error ?? "unknown error"}`;
    console.log(
      `  ${pad(status, 5)} ${pad(`${city.name}, ${city.country}`, 18)} ${detail}`,
    );
    await sleep(SPACING_MS);
  }

  console.log("\n" + "-".repeat(48));
  console.log(`${pad("CITY", 20)} ${pad("COUNT", 7)} RESULT`);
  console.log("-".repeat(48));
  for (const { city, result } of rows) {
    console.log(
      `${pad(`${city.name}, ${city.country}`, 20)} ${pad(result.count, 7)} ${result.ok ? "PASS" : "FAIL"}`,
    );
  }
  console.log("-".repeat(48));

  const passed = rows.filter((r) => r.result.ok).length;
  const total = rows.length;
  const allPass = passed === total;
  console.log(`\n${allPass ? "PASS" : "FAIL"}: ${passed}/${total} cities returned >=1 candidate.`);

  if (!allPass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Coverage smoke crashed:", err);
  process.exit(1);
});
