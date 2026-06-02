import {
  type WeatherForecast,
  type Prediction,
  type PredictionData,
  type AirQualityForecast,
} from "~/lib/sunset/type";

export async function getSunsetPrediction(latitude: number, longitude: number) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset,daylight_duration,sunshine_duration&hourly=temperature_2m,weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,surface_pressure,dew_point_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,uv_index,uv_index_clear_sky,cape&timezone=auto&forecast_days=6`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,aerosol_optical_depth&current=us_aqi&timezone=auto&forecast_days=6`;
  // Fetch weather and air quality data
  const [weatherRes, airQualityRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(airQualityUrl),
  ]);

  // Check for rate limit error
  if (weatherRes.status === 429 || airQualityRes.status === 429) {
    throw new Error("429 Too Many Requests");
  }

  if (!weatherRes.ok) {
    throw new Error(`HTTP error! status: ${weatherRes.status}`);
  }

  if (!airQualityRes.ok) {
    throw new Error(`HTTP error! status: ${airQualityRes.status}`);
  }

  const weatherForecast = (await weatherRes.json()) as WeatherForecast;
  const airQualityForecast = (await airQualityRes.json()) as AirQualityForecast;
  const predictions = calculateSunsetPredictions(
    weatherForecast,
    airQualityForecast,
  ) as unknown as Prediction[];
  return predictions;
}

// Calculate sunset predictions
export function calculateSunsetPredictions(
  forecast: WeatherForecast,
  airQualityForecast?: AirQualityForecast,
) {
  const predictions = [];
  const numberOfDays = forecast.daily?.time?.length ?? 0;
  // Process each day
  for (let i = 0; i < numberOfDays; i++) {
    const sunsetTime = forecast?.daily?.sunset[i];
    if (!sunsetTime) {
      console.error(
        "Error: Sunset time is undefined for",
        forecast.daily.time[i],
      );
      continue;
    }
    const startTime: string = sunsetTime.slice(0, -2) + "00";
    const sunset_start_hourly_index: number = forecast.hourly.time.findIndex(
      (time: string) => {
        return time === startTime;
      },
    );
    if (sunset_start_hourly_index === -1) {
      console.error(
        "Error: Sunset time not found in hourly forecast for",
        forecast.daily.time[i],
      );
      continue;
    }
    const sunset_end_hourly_index = sunset_start_hourly_index + 1;
    const interpolateRatio = Number(forecast?.daily?.sunset[i]?.slice(-2)) / 60;

    // Interpolate air quality data
    let pm10 = 0;
    let pm2_5 = 0;
    let european_aqi = 0;
    let ozone = 0;
    let nitrogen_dioxide = 0;
    let aerosol_optical_depth = 0;

    if (airQualityForecast?.hourly) {
      if (
        airQualityForecast.hourly.pm10?.[sunset_start_hourly_index] !==
        undefined
      ) {
        pm10 = interpolate(
          airQualityForecast.hourly.pm10[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.pm10[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }

      if (
        airQualityForecast.hourly.pm2_5?.[sunset_start_hourly_index] !==
        undefined
      ) {
        pm2_5 = interpolate(
          airQualityForecast.hourly.pm2_5[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.pm2_5[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }

      if (
        airQualityForecast.hourly.european_aqi?.[sunset_start_hourly_index] !==
        undefined
      ) {
        european_aqi = interpolate(
          airQualityForecast.hourly.european_aqi[sunset_start_hourly_index] ??
            0,
          airQualityForecast.hourly.european_aqi[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }

      if (
        airQualityForecast.hourly.ozone?.[sunset_start_hourly_index] !==
        undefined
      ) {
        ozone = interpolate(
          airQualityForecast.hourly.ozone[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.ozone[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }

      if (
        airQualityForecast.hourly.nitrogen_dioxide?.[
          sunset_start_hourly_index
        ] !== undefined
      ) {
        nitrogen_dioxide = interpolate(
          airQualityForecast.hourly.nitrogen_dioxide[
            sunset_start_hourly_index
          ] ?? 0,
          airQualityForecast.hourly.nitrogen_dioxide[sunset_end_hourly_index] ??
            0,
          interpolateRatio,
        );
      }

      if (
        airQualityForecast.hourly.aerosol_optical_depth?.[
          sunset_start_hourly_index
        ] !== undefined
      ) {
        aerosol_optical_depth = interpolate(
          airQualityForecast.hourly.aerosol_optical_depth[
            sunset_start_hourly_index
          ] ?? 0,
          airQualityForecast.hourly.aerosol_optical_depth[
            sunset_end_hourly_index
          ] ?? 0,
          interpolateRatio,
        );
      }
    }

    const prediction = {
      golden_hour: calculateGoldenHour(
        forecast.daily.sunset[i]!,
        forecast.daily.daylight_duration[i]!,
      ),
      daylight_duration: forecast.daily.daylight_duration[i]!,
      sunset_start_hourly_index: sunset_start_hourly_index,
      sunset_end_hourly_index: sunset_end_hourly_index,
      sunset_window: {
        start: forecast.hourly.time[sunset_start_hourly_index]!,
        end: forecast.hourly.time[sunset_end_hourly_index]!,
      },
      sunset: forecast.daily.sunset[i]!,
      cloud_cover: interpolate(
        forecast.hourly.cloud_cover[sunset_start_hourly_index]!,
        forecast.hourly.cloud_cover[sunset_end_hourly_index]!,
        interpolateRatio,
      ),
      cloud_cover_low: interpolate(
        forecast.hourly.cloud_cover_low[sunset_start_hourly_index]!,
        forecast.hourly.cloud_cover_low[sunset_end_hourly_index]!,
        interpolateRatio,
      ),
      cloud_cover_mid: interpolate(
        forecast.hourly.cloud_cover_mid[sunset_start_hourly_index] ?? 0,
        forecast.hourly.cloud_cover_mid[sunset_end_hourly_index] ?? 0,
        interpolateRatio,
      ),
      cloud_cover_high: interpolate(
        forecast.hourly.cloud_cover_high[sunset_start_hourly_index] ?? 0,
        forecast.hourly.cloud_cover_high[sunset_end_hourly_index] ?? 0,
        interpolateRatio,
      ),
      visibility: interpolate(
        forecast.hourly.visibility[sunset_start_hourly_index]!,
        forecast.hourly.visibility[sunset_end_hourly_index]!,
        interpolateRatio,
      ),
      humidity: interpolate(
        forecast.hourly.relative_humidity_2m[sunset_start_hourly_index]!,
        forecast.hourly.relative_humidity_2m[sunset_end_hourly_index]!,
        interpolateRatio,
      ),
      surface_pressure: interpolate(
        forecast.hourly.surface_pressure[sunset_start_hourly_index] ?? 1013.25,
        forecast.hourly.surface_pressure[sunset_end_hourly_index] ?? 1013.25,
        interpolateRatio,
      ),
      weather_code: interpolate(
        forecast.hourly.weather_code[sunset_start_hourly_index]!,
        forecast.hourly.weather_code[sunset_end_hourly_index]!,
        interpolateRatio,
        "closest",
      ),
      // Enhanced weather parameters
      temperature_2m: interpolate(
        forecast.hourly.temperature_2m?.[sunset_start_hourly_index] ?? 15,
        forecast.hourly.temperature_2m?.[sunset_end_hourly_index] ?? 15,
        interpolateRatio,
      ),
      dew_point_2m: interpolate(
        forecast.hourly.dew_point_2m?.[sunset_start_hourly_index] ?? 10,
        forecast.hourly.dew_point_2m?.[sunset_end_hourly_index] ?? 10,
        interpolateRatio,
      ),
      wind_speed_10m: interpolate(
        forecast.hourly.wind_speed_10m?.[sunset_start_hourly_index] ?? 5,
        forecast.hourly.wind_speed_10m?.[sunset_end_hourly_index] ?? 5,
        interpolateRatio,
      ),
      wind_direction_10m: interpolate(
        forecast.hourly.wind_direction_10m?.[sunset_start_hourly_index] ?? 180,
        forecast.hourly.wind_direction_10m?.[sunset_end_hourly_index] ?? 180,
        interpolateRatio,
        "closest",
      ),
      precipitation_probability: interpolate(
        forecast.hourly.precipitation_probability?.[
          sunset_start_hourly_index
        ] ?? 0,
        forecast.hourly.precipitation_probability?.[sunset_end_hourly_index] ??
          0,
        interpolateRatio,
      ),
      cape: interpolate(
        forecast.hourly.cape?.[sunset_start_hourly_index] ?? 0,
        forecast.hourly.cape?.[sunset_end_hourly_index] ?? 0,
        interpolateRatio,
      ),
      cin: interpolate(
        forecast.hourly.cin?.[sunset_start_hourly_index] ?? 0,
        forecast.hourly.cin?.[sunset_end_hourly_index] ?? 0,
        interpolateRatio,
      ),
      uv_index: interpolate(
        forecast.hourly.uv_index?.[sunset_start_hourly_index] ?? 0,
        forecast.hourly.uv_index?.[sunset_end_hourly_index] ?? 0,
        interpolateRatio,
      ),
      uv_index_clear_sky: interpolate(
        forecast.hourly.uv_index_clear_sky?.[sunset_start_hourly_index] ?? 0,
        forecast.hourly.uv_index_clear_sky?.[sunset_end_hourly_index] ?? 0,
        interpolateRatio,
      ),
      // Air quality data
      pm10,
      pm2_5,
      european_aqi,
      // Enhanced air quality parameters
      aerosol_optical_depth,
      ozone,
      nitrogen_dioxide,
    };
    const sunsetScore = calculateSunsetScore(prediction);
    const res = {
      score: sunsetScore.score,
      golden_hour: prediction.golden_hour,
      weather_code: prediction.weather_code,
      sunset_time: prediction.sunset,
      scores: sunsetScore,
      // Detailed weather information
      cloud_cover: prediction.cloud_cover,
      cloud_cover_low: prediction.cloud_cover_low,
      cloud_cover_mid: prediction.cloud_cover_mid,
      cloud_cover_high: prediction.cloud_cover_high,
      visibility: prediction.visibility,
      humidity: prediction.humidity,
      surface_pressure: prediction.surface_pressure,
      // Enhanced weather parameters
      temperature_2m: prediction.temperature_2m,
      dew_point_2m: prediction.dew_point_2m,
      wind_speed_10m: prediction.wind_speed_10m,
      wind_direction_10m: prediction.wind_direction_10m,
      precipitation_probability: prediction.precipitation_probability,
      cape: prediction.cape,
      cin: prediction.cin,
      uv_index: prediction.uv_index,
      uv_index_clear_sky: prediction.uv_index_clear_sky,
      // Air quality data
      pm10: prediction.pm10,
      pm2_5: prediction.pm2_5,
      european_aqi: prediction.european_aqi,
      // Enhanced air quality parameters
      aerosol_optical_depth: prediction.aerosol_optical_depth,
      ozone: prediction.ozone,
      nitrogen_dioxide: prediction.nitrogen_dioxide,
    };
    predictions.push(res);
  }

  return predictions;
}

// Calculate the golden hour based on the sunset time and daylight duration
function calculateGoldenHour(sunset: string, daylight_duration: number) {
  const goldenHourDuration = (daylight_duration / 60 / 12) * 0.9; // 5% of daylight duration
  const sunsetDate = new Date(sunset); // Use timezone-aware date from API
  const goldenHour = new Date(sunsetDate.getTime());
  goldenHour.setMinutes(goldenHour.getMinutes() - goldenHourDuration);
  const goldenHourString = goldenHour.toISOString();
  return { start: goldenHourString, end: sunset };
}

// Interpolate between two values based on a ratio
// type closest will return the closest value to the ratio
function interpolate(start: number, end: number, ratio: number, type?: string) {
  if (type === "closest") {
    if (ratio <= 0.5) {
      return start;
    }
    return end;
  }
  return start + (end - start) * ratio;
}

/**
 * Calculate the overall sunset quality score using weighted additive scoring.
 *
 * Architecture: weighted additive base (7 factors, weights sum to 1.0) with a
 * single multiplicative precipitation blocker. Additive scoring means "average
 * on each factor" correctly produces an average total — the previous multiplicative
 * approach caused typical days to collapse to 30-40% regardless of actual conditions.
 *
 * Factor weights reflect empirical sunset quality research:
 *   cloud quality    35% — dominant; layering and height matter more than raw coverage
 *   visibility       18% — atmospheric clarity/transmission
 *   humidity         13% — water vapour scattering
 *   pressure         12% — weather-system stability proxy
 *   aerosol enhance  10% — moderate PM2.5 enhances reds; clean air still scores 0.80
 *   wind              7% — cloud stability and aerosol transport
 *   temperature       5% — density/moisture capacity proxy
 *
 * Precipitation probability is the only true veto — applied multiplicatively so a
 * 90%+ rain forecast can drive the score to near-zero regardless of other factors.
 *
 * Stability, UV, AOD, AQI, ozone and NO2 are computed for diagnostic display only.
 *
 * Expected output range:
 *   Perfect (high cirrus, low humidity, clear vis)   →  90–98
 *   Good    (some cloud texture, mild conditions)    →  70–85
 *   Average (typical mixed-cloud day)                →  50–65
 *   Poor    (significant low clouds + rain chance)   →  25–45
 *   Very poor (overcast, likely rain)                →  <15
 */
function calculateSunsetScore(prediction: PredictionData) {
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

  // Diagnostic-only — not included in main score
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

// Piecewise linear mapping of surface pressure → score.
// High pressure (≥1025 hPa) = stable anticyclone, suppressed clouds → 1.0.
// Standard MSLP (~1013 hPa) → 0.90. Deep lows (<970 hPa) → 0.25–0.35.
function pressureScore(prediction: PredictionData): number {
  const p = prediction.surface_pressure;

  if (p >= 1025) return 1.0;
  if (p >= 1013) return 0.90 + ((p - 1013) / 12) * 0.10;  // 1013→0.90, 1025→1.00
  if (p >= 1000) return 0.75 + ((p - 1000) / 13) * 0.15;  // 1000→0.75, 1013→0.90
  if (p >= 990)  return 0.60 + ((p - 990)  / 10) * 0.15;  // 990→0.60, 1000→0.75
  if (p >= 980)  return 0.45 + ((p - 980)  / 10) * 0.15;  // 980→0.45, 990→0.60
  if (p >= 970)  return 0.35 + ((p - 970)  / 10) * 0.10;  // 970→0.35, 980→0.45
  return Math.max(0.25, 0.35 - (970 - p) * 0.01);
}

// Aerosol enhancement: moderate PM2.5 (12–25 µg/m³) scatters blue wavelengths,
// intensifying reds and oranges. Critically, very clean air (<5 µg/m³) still scores
// 0.80 — it produces vivid, unenhanced colors and must not be penalized.
// AOD acts as a fine-grained modifier on top of the PM2.5 base score.
function aerosolEnhancementScore(prediction: PredictionData): number {
  const pm2_5 = prediction.pm2_5;
  const aod   = prediction.aerosol_optical_depth;

  let pm25Score: number;
  if (pm2_5 < 3)         pm25Score = 0.80;
  else if (pm2_5 < 12)   pm25Score = 0.80 + ((pm2_5 - 3)  / 9)  * 0.15;  // 0.80 → 0.95
  else if (pm2_5 < 25)   pm25Score = 0.95 + ((pm2_5 - 12) / 13) * 0.05;  // 0.95 → 1.00
  else if (pm2_5 < 50)   pm25Score = 1.00 - ((pm2_5 - 25) / 25) * 0.20;  // 1.00 → 0.80
  else if (pm2_5 < 75)   pm25Score = 0.80 - ((pm2_5 - 50) / 25) * 0.25;  // 0.80 → 0.55
  else if (pm2_5 < 150)  pm25Score = 0.55 - ((pm2_5 - 75) / 75) * 0.25;  // 0.55 → 0.30
  else                   pm25Score = 0.30;

  const aodModifier = aod < 0.15 ? -0.05
                    : aod < 0.30 ?  0.05
                    : aod < 0.50 ?  0.00
                    : aod < 0.80 ? -0.10
                    :              -0.25;

  return Math.max(0.25, Math.min(1.0, pm25Score + aodModifier));
}

// Piecewise linear humidity → score. High humidity scatters light via water vapour
// and aerosol nucleation, muting sunset colours. Full range 0.35–1.0.
function humidityScore(prediction: PredictionData): number {
  const h = prediction.humidity;
  if (h >= 90) return 0.35;
  if (h >= 80) return 0.48 - ((h - 80) / 10) * 0.13;  // 80→0.48, 90→0.35
  if (h >= 65) return 0.65 - ((h - 65) / 15) * 0.17;  // 65→0.65, 80→0.48
  if (h >= 50) return 0.80 - ((h - 50) / 15) * 0.15;  // 50→0.80, 65→0.65
  if (h >= 35) return 0.90 - ((h - 35) / 15) * 0.10;  // 35→0.90, 50→0.80
  if (h >= 20) return 1.00 - ((h - 20) / 15) * 0.10;  // 20→1.00, 35→0.90
  return 1.0;
}

// Visibility in metres → score. Piecewise linear across the full 0.15–1.0 range.
// Dense fog (<1 km) = 0.15; >30 km crystal-clear = 1.0; typical 10–20 km → 0.78–0.90.
function visibilityScore(prediction: PredictionData): number {
  const vis = prediction.visibility;
  if (vis < 1000)   return 0.15;
  if (vis < 3000)   return 0.15 + ((vis - 1000)  / 2000)  * 0.20;  // 0.15 → 0.35
  if (vis < 7000)   return 0.35 + ((vis - 3000)  / 4000)  * 0.25;  // 0.35 → 0.60
  if (vis < 12000)  return 0.60 + ((vis - 7000)  / 5000)  * 0.18;  // 0.60 → 0.78
  if (vis < 20000)  return 0.78 + ((vis - 12000) / 8000)  * 0.12;  // 0.78 → 0.90
  if (vis < 30000)  return 0.90 + ((vis - 20000) / 10000) * 0.10;  // 0.90 → 1.00
  return 1.0;
}

// Cloud quality is the dominant factor (35% weight). Scoring separates the blocking
// effect of low clouds from the enhancement potential of mid/high clouds.
//
// Clear sky (all layers = 0%) → ~0.69 (pleasant but not dramatic).
// Optimal (high ≈ 50%, mid ≈ 30%, low < 15%) → ~1.0 (spectacular cirrus layering).
// Heavy low overcast (low > 85%) → <0.10 (effectively blocks the sunset).
//
// Low cloud penalty: steep non-linear decline starting at 15%.
// Mid bonus: Mie-scattering altocumulus best at 25–50%.
// High bonus: Rayleigh-scattering cirrus ice crystals best at 35–60%.
function cloudQualityScore(prediction: PredictionData): number {
  const low  = prediction.cloud_cover_low;
  const mid  = prediction.cloud_cover_mid;
  const high = prediction.cloud_cover_high;

  let lowPenalty: number;
  if (low <= 15)      lowPenalty = 1.0;
  else if (low <= 35) lowPenalty = 1.00 - ((low - 15) / 20) * 0.25;  // 1.00 → 0.75
  else if (low <= 60) lowPenalty = 0.75 - ((low - 35) / 25) * 0.40;  // 0.75 → 0.35
  else if (low <= 85) lowPenalty = 0.35 - ((low - 60) / 25) * 0.23;  // 0.35 → 0.12
  else                lowPenalty = Math.max(0.05, 0.12 - (low - 85) * 0.007);

  let midBonus: number;
  if (mid < 5)        midBonus = 0.70;
  else if (mid < 25)  midBonus = 0.70 + ((mid - 5)  / 20) * 0.22;   // 0.70 → 0.92
  else if (mid < 50)  midBonus = 0.92 + ((mid - 25) / 25) * 0.08;   // 0.92 → 1.00
  else if (mid < 75)  midBonus = 1.00 - ((mid - 50) / 25) * 0.12;   // 1.00 → 0.88
  else                midBonus = Math.max(0.72, 0.88 - (mid - 75) * 0.006);

  let highBonus: number;
  if (high < 5)        highBonus = 0.68;
  else if (high < 20)  highBonus = 0.68 + ((high - 5)  / 15) * 0.20;  // 0.68 → 0.88
  else if (high < 55)  highBonus = 0.88 + ((high - 20) / 35) * 0.12;  // 0.88 → 1.00
  else if (high < 80)  highBonus = 1.00 - ((high - 55) / 25) * 0.10;  // 1.00 → 0.90
  else                 highBonus = Math.max(0.78, 0.90 - (high - 80) * 0.006);

  // High cirrus contributes more drama than mid-level cloud (60/40 weighting)
  const textureScore     = midBonus * 0.40 + highBonus * 0.60;
  const interactionBonus = (mid > 20 && high > 20 && low < 25) ? 1.05 : 1.0;

  return Math.max(0.05, Math.min(1.0, textureScore * lowPenalty * interactionBonus));
}

// Light breeze (5–15 km/h) is optimal — stable cloud formations without stagnation.
// Calm (<5 km/h) rates 0.95 rather than 1.0: stagnant air can accumulate haze.
function windScore(prediction: PredictionData): number {
  const ws = prediction.wind_speed_10m;
  if (ws < 5)   return 0.95;
  if (ws < 15)  return 1.00;
  if (ws < 25)  return 1.00 - ((ws - 15) / 10) * 0.12;  // 1.00 → 0.88
  if (ws < 35)  return 0.88 - ((ws - 25) / 10) * 0.18;  // 0.88 → 0.70
  if (ws < 50)  return 0.70 - ((ws - 35) / 15) * 0.22;  // 0.70 → 0.48
  return Math.max(0.38, 0.48 - (ws - 50) * 0.01);
}

// Temperature affects air density (refraction), moisture capacity (haze risk) and
// thermal stability. Optimal 10–25 °C; extreme cold or heat both degrade transmission.
function temperatureScore(prediction: PredictionData): number {
  const temp = prediction.temperature_2m;
  if (temp < -10)  return 0.65;
  if (temp < 0)    return 0.65 + ((temp + 10) / 10) * 0.15;  // -10→0.65, 0→0.80
  if (temp < 10)   return 0.80 + (temp         / 10) * 0.15;  // 0→0.80, 10→0.95
  if (temp < 25)   return 0.95 + ((temp - 10)  / 15) * 0.05;  // 10→0.95, 25→1.00
  if (temp < 35)   return 1.00 - ((temp - 25)  / 10) * 0.12;  // 25→1.00, 35→0.88
  if (temp < 45)   return 0.88 - ((temp - 35)  / 10) * 0.18;  // 35→0.88, 45→0.70
  return Math.max(0.55, 0.70 - (temp - 45) * 0.015);
}

// Precipitation probability is the single strongest predictor of a ruined sunset.
// Applied multiplicatively so a near-certain rain forecast drives the score toward zero
// regardless of how good all other factors are.
function precipitationBlocker(prediction: PredictionData): number {
  const prob = prediction.precipitation_probability;
  if (prob < 10)   return 1.00;
  if (prob < 25)   return 1.00 - ((prob - 10) / 15) * 0.12;  // 1.00 → 0.88
  if (prob < 50)   return 0.88 - ((prob - 25) / 25) * 0.28;  // 0.88 → 0.60
  if (prob < 70)   return 0.60 - ((prob - 50) / 20) * 0.25;  // 0.60 → 0.35
  if (prob < 90)   return 0.35 - ((prob - 70) / 20) * 0.20;  // 0.35 → 0.15
  return Math.max(0.05, 0.15 - (prob - 90) * 0.01);
}

// Diagnostic only — not included in main score.
function stabilityScore(prediction: PredictionData): number {
  const cape = prediction.cape;
  const cin  = prediction.cin;
  let score  = 1;
  if (cape > 1000)      score *= 0.6;
  else if (cape > 500)  score *= 0.8;
  if (cin > 200)        score *= 1.0;
  else if (cin > 50)    score *= 0.9;
  else                  score *= 0.7;
  return score;
}

// Diagnostic only — not included in main score.
function uvScore(prediction: PredictionData): number {
  const uvIndex = prediction.uv_index;
  if (uvIndex < 2)   return 0.8;
  if (uvIndex < 5)   return 0.9;
  if (uvIndex < 8)   return 1.0;
  return 0.95;
}

// Diagnostic only — not included in main score.
function aerosolOpticalDepthScore(prediction: PredictionData): number {
  const aod = prediction.aerosol_optical_depth;
  if (aod > 0.8)   return 0.3;
  if (aod > 0.5)   return 0.5;
  if (aod > 0.3)   return 0.7;
  if (aod > 0.1)   return 0.9;
  return 0.8;
}

// Diagnostic only — not included in main score.
function europeanAQIScore(prediction: PredictionData): number {
  const aqi = prediction.european_aqi;
  if (aqi > 80)   return 0.3;
  if (aqi > 60)   return 0.5;
  if (aqi > 40)   return 0.8;
  if (aqi > 20)   return 0.9;
  return 0.8;
}

// Diagnostic only — not included in main score.
function ozoneScore(prediction: PredictionData): number {
  const ozone = prediction.ozone;
  if (ozone > 150)   return 0.4;
  if (ozone > 100)   return 0.6;
  if (ozone > 60)    return 0.9;
  if (ozone > 30)    return 0.8;
  return 0.7;
}

// Diagnostic only — not included in main score.
function nitrogenDioxideScore(prediction: PredictionData): number {
  const no2 = prediction.nitrogen_dioxide;
  if (no2 > 120)   return 0.4;
  if (no2 > 80)    return 0.6;
  if (no2 > 40)    return 0.9;
  if (no2 > 20)    return 0.8;
  return 0.7;
}
