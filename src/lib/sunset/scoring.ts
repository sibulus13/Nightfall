import { type PredictionData } from "~/lib/sunset/type";

/**
 * Weighted additive scoring (7 factors, weights sum to 1.0) with a single
 * multiplicative precipitation blocker.
 *
 * Factor weights:
 *   cloud quality    35%
 *   visibility       18%
 *   humidity         13%
 *   pressure         12%
 *   aerosol enhance  10%
 *   wind              7%
 *   temperature       5%
 *
 * Stability, UV, AOD, AQI, ozone and NO2 are diagnostic-only.
 */
export function calculateSunsetScore(prediction: PredictionData) {
  const cCScore = cloudQualityScore(prediction);
  const vsScore = visibilityScore(prediction);
  const hScore  = humidityScore(prediction);
  const pScore  = pressureScore(prediction);
  const aScore  = aerosolEnhancementScore(prediction);
  const wScore  = windScore(prediction);
  const tScore  = temperatureScore(prediction);

  const baseScore =
    cCScore * 0.35 +
    vsScore * 0.18 +
    hScore  * 0.13 +
    pScore  * 0.12 +
    aScore  * 0.10 +
    wScore  * 0.07 +
    tScore  * 0.05;

  const precipBlock = precipitationBlocker(prediction);
  const finalScore  = Math.max(0.01, Math.min(1.0, baseScore * precipBlock));

  const sScore   = stabilityScore(prediction);
  const uScore   = uvScore(prediction);
  const aodScore = aerosolOpticalDepthScore(prediction);
  const aqiScore = europeanAQIScore(prediction);
  const o3Score  = ozoneScore(prediction);
  const no2Score = nitrogenDioxideScore(prediction);

  return {
    score:               Math.round(finalScore  * 100),
    cloudCoverage:       Math.round(cCScore     * 100),
    visibility:          Math.round(vsScore     * 100),
    humidity:            Math.round(hScore      * 100),
    pressure:            Math.round(pScore      * 100),
    particulate:         Math.round(aScore      * 100),
    wind:                Math.round(wScore      * 100),
    temperature:         Math.round(tScore      * 100),
    precipitation:       Math.round(precipBlock * 100),
    stability:           Math.round(sScore      * 100),
    uv:                  Math.round(uScore      * 100),
    aerosolOpticalDepth: Math.round(aodScore    * 100),
    europeanAQI:         Math.round(aqiScore    * 100),
    ozone:               Math.round(o3Score     * 100),
    nitrogenDioxide:     Math.round(no2Score    * 100),
  };
}

// High pressure (≥1025 hPa) = stable anticyclone → 1.0. Deep lows (<970 hPa) → 0.25–0.35.
function pressureScore(prediction: PredictionData): number {
  const p = prediction.surface_pressure;
  if (p >= 1025) return 1.0;
  if (p >= 1013) return 0.90 + ((p - 1013) / 12) * 0.10;
  if (p >= 1000) return 0.75 + ((p - 1000) / 13) * 0.15;
  if (p >= 990)  return 0.60 + ((p - 990)  / 10) * 0.15;
  if (p >= 980)  return 0.45 + ((p - 980)  / 10) * 0.15;
  if (p >= 970)  return 0.35 + ((p - 970)  / 10) * 0.10;
  return Math.max(0.25, 0.35 - (970 - p) * 0.01);
}

// Moderate PM2.5 (12–25 µg/m³) scatters blue wavelengths, intensifying reds.
// Very clean air (<5 µg/m³) still scores 0.80 — vivid unenhanced colors.
function aerosolEnhancementScore(prediction: PredictionData): number {
  const pm2_5 = prediction.pm2_5;
  const aod   = prediction.aerosol_optical_depth;

  let pm25Score: number;
  if (pm2_5 < 3)        pm25Score = 0.80;
  else if (pm2_5 < 12)  pm25Score = 0.80 + ((pm2_5 - 3)  / 9)  * 0.15;
  else if (pm2_5 < 25)  pm25Score = 0.95 + ((pm2_5 - 12) / 13) * 0.05;
  else if (pm2_5 < 50)  pm25Score = 1.00 - ((pm2_5 - 25) / 25) * 0.20;
  else if (pm2_5 < 75)  pm25Score = 0.80 - ((pm2_5 - 50) / 25) * 0.25;
  else if (pm2_5 < 150) pm25Score = 0.55 - ((pm2_5 - 75) / 75) * 0.25;
  else                  pm25Score = 0.30;

  const aodModifier = aod < 0.15 ? -0.05
                    : aod < 0.30 ?  0.05
                    : aod < 0.50 ?  0.00
                    : aod < 0.80 ? -0.10
                    :              -0.25;

  return Math.max(0.25, Math.min(1.0, pm25Score + aodModifier));
}

// High humidity scatters light via water vapour and aerosol nucleation, muting colours.
function humidityScore(prediction: PredictionData): number {
  const h = prediction.humidity;
  if (h >= 90) return 0.35;
  if (h >= 80) return 0.48 - ((h - 80) / 10) * 0.13;
  if (h >= 65) return 0.65 - ((h - 65) / 15) * 0.17;
  if (h >= 50) return 0.80 - ((h - 50) / 15) * 0.15;
  if (h >= 35) return 0.90 - ((h - 35) / 15) * 0.10;
  if (h >= 20) return 1.00 - ((h - 20) / 15) * 0.10;
  return 1.0;
}

// Dense fog (<1 km) = 0.15; >30 km crystal-clear = 1.0.
function visibilityScore(prediction: PredictionData): number {
  const vis = prediction.visibility;
  if (vis < 1000)  return 0.15;
  if (vis < 3000)  return 0.15 + ((vis - 1000)  / 2000)  * 0.20;
  if (vis < 7000)  return 0.35 + ((vis - 3000)  / 4000)  * 0.25;
  if (vis < 12000) return 0.60 + ((vis - 7000)  / 5000)  * 0.18;
  if (vis < 20000) return 0.78 + ((vis - 12000) / 8000)  * 0.12;
  if (vis < 30000) return 0.90 + ((vis - 20000) / 10000) * 0.10;
  return 1.0;
}

// Clear sky → ~0.69. Optimal (high ≈ 50%, mid ≈ 30%, low < 15%) → ~1.0.
// Heavy low overcast (low > 85%) → <0.10.
function cloudQualityScore(prediction: PredictionData): number {
  const low  = prediction.cloud_cover_low;
  const mid  = prediction.cloud_cover_mid;
  const high = prediction.cloud_cover_high;

  let lowPenalty: number;
  if (low <= 15)      lowPenalty = 1.0;
  else if (low <= 35) lowPenalty = 1.00 - ((low - 15) / 20) * 0.25;
  else if (low <= 60) lowPenalty = 0.75 - ((low - 35) / 25) * 0.40;
  else if (low <= 85) lowPenalty = 0.35 - ((low - 60) / 25) * 0.23;
  else                lowPenalty = Math.max(0.05, 0.12 - (low - 85) * 0.007);

  let midBonus: number;
  if (mid < 5)       midBonus = 0.70;
  else if (mid < 25) midBonus = 0.70 + ((mid - 5)  / 20) * 0.22;
  else if (mid < 50) midBonus = 0.92 + ((mid - 25) / 25) * 0.08;
  else if (mid < 75) midBonus = 1.00 - ((mid - 50) / 25) * 0.12;
  else               midBonus = Math.max(0.72, 0.88 - (mid - 75) * 0.006);

  let highBonus: number;
  if (high < 5)       highBonus = 0.68;
  else if (high < 20) highBonus = 0.68 + ((high - 5)  / 15) * 0.20;
  else if (high < 55) highBonus = 0.88 + ((high - 20) / 35) * 0.12;
  else if (high < 80) highBonus = 1.00 - ((high - 55) / 25) * 0.10;
  else                highBonus = Math.max(0.78, 0.90 - (high - 80) * 0.006);

  const textureScore     = midBonus * 0.40 + highBonus * 0.60;
  const interactionBonus = (mid > 20 && high > 20 && low < 25) ? 1.05 : 1.0;

  return Math.max(0.05, Math.min(1.0, textureScore * lowPenalty * interactionBonus));
}

// Light breeze (5–15 km/h) is optimal. Calm (<5) rates 0.95: stagnant air accumulates haze.
function windScore(prediction: PredictionData): number {
  const ws = prediction.wind_speed_10m;
  if (ws < 5)  return 0.95;
  if (ws < 15) return 1.00;
  if (ws < 25) return 1.00 - ((ws - 15) / 10) * 0.12;
  if (ws < 35) return 0.88 - ((ws - 25) / 10) * 0.18;
  if (ws < 50) return 0.70 - ((ws - 35) / 15) * 0.22;
  return Math.max(0.38, 0.48 - (ws - 50) * 0.01);
}

// Optimal 10–25 °C; extreme cold or heat both degrade atmospheric transmission.
function temperatureScore(prediction: PredictionData): number {
  const temp = prediction.temperature_2m;
  if (temp < -10) return 0.65;
  if (temp < 0)   return 0.65 + ((temp + 10) / 10) * 0.15;
  if (temp < 10)  return 0.80 + (temp         / 10) * 0.15;
  if (temp < 25)  return 0.95 + ((temp - 10)  / 15) * 0.05;
  if (temp < 35)  return 1.00 - ((temp - 25)  / 10) * 0.12;
  if (temp < 45)  return 0.88 - ((temp - 35)  / 10) * 0.18;
  return Math.max(0.55, 0.70 - (temp - 45) * 0.015);
}

// Applied multiplicatively — a near-certain rain forecast drives score toward zero.
function precipitationBlocker(prediction: PredictionData): number {
  const prob = prediction.precipitation_probability;
  if (prob < 10) return 1.00;
  if (prob < 25) return 1.00 - ((prob - 10) / 15) * 0.12;
  if (prob < 50) return 0.88 - ((prob - 25) / 25) * 0.28;
  if (prob < 70) return 0.60 - ((prob - 50) / 20) * 0.25;
  if (prob < 90) return 0.35 - ((prob - 70) / 20) * 0.20;
  return Math.max(0.05, 0.15 - (prob - 90) * 0.01);
}

// --- Diagnostic only (not included in main score) ---

function stabilityScore(prediction: PredictionData): number {
  const cape = prediction.cape;
  const cin  = prediction.cin;
  let score  = 1;
  if (cape > 1000)     score *= 0.6;
  else if (cape > 500) score *= 0.8;
  if (cin > 200)       score *= 1.0;
  else if (cin > 50)   score *= 0.9;
  else                 score *= 0.7;
  return score;
}

function uvScore(prediction: PredictionData): number {
  const uvIndex = prediction.uv_index;
  if (uvIndex < 2) return 0.8;
  if (uvIndex < 5) return 0.9;
  if (uvIndex < 8) return 1.0;
  return 0.95;
}

function aerosolOpticalDepthScore(prediction: PredictionData): number {
  const aod = prediction.aerosol_optical_depth;
  if (aod > 0.8) return 0.3;
  if (aod > 0.5) return 0.5;
  if (aod > 0.3) return 0.7;
  if (aod > 0.1) return 0.9;
  return 0.8;
}

function europeanAQIScore(prediction: PredictionData): number {
  const aqi = prediction.european_aqi;
  if (aqi > 80) return 0.3;
  if (aqi > 60) return 0.5;
  if (aqi > 40) return 0.8;
  if (aqi > 20) return 0.9;
  return 0.8;
}

function ozoneScore(prediction: PredictionData): number {
  const ozone = prediction.ozone;
  if (ozone > 150) return 0.4;
  if (ozone > 100) return 0.6;
  if (ozone > 60)  return 0.9;
  if (ozone > 30)  return 0.8;
  return 0.7;
}

function nitrogenDioxideScore(prediction: PredictionData): number {
  const no2 = prediction.nitrogen_dioxide;
  if (no2 > 120) return 0.4;
  if (no2 > 80)  return 0.6;
  if (no2 > 40)  return 0.9;
  if (no2 > 20)  return 0.8;
  return 0.7;
}
