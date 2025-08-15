import {
  type WeatherForecast,
  type Prediction,
  type PredictionData,
} from "~/lib/sunset/type";

export async function getSunsetPrediction(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,surface_pressure&daily=sunrise,sunset,daylight_duration,sunshine_duration&timezone=auto`;
  const res = await fetch(url);

  // Check for rate limit error
  if (res.status === 429) {
    throw new Error("429 Too Many Requests");
  }

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  const forecast = (await res.json()) as WeatherForecast;
  const predictions = calculateSunsetPredictions(
    forecast,
  ) as unknown as Prediction[];
  return predictions;
}

// Calculates the sunset predictions based on the forecast data
export function calculateSunsetPredictions(forecast: WeatherForecast) {
  const predictions = [];
  const numberOfDays = forecast.daily?.time?.length ?? 0;
  // Get the sunset and sunrise times for each day
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
    };
    predictions.push(res);
  }

  // TODO add Air Quality to calculation
  // TODO clean up results and remove unnecessary data
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
 * Calculate the overall sunset quality score based on meteorological conditions
 *
 * Sunset quality is determined by how well sunlight can reach the observer and create
 * the characteristic red/orange colors. The key factors are:
 *
 * 1. Cloud Coverage: Affects light scattering and blocking
 *    - Low clouds (0-2km): Block direct sunlight, generally bad for sunsets
 *    - Mid clouds (2-6km): Can enhance colors through scattering
 *    - High clouds (6-12km): Cirrus clouds can create spectacular sunsets
 *
 * 2. Visibility: Indicates atmospheric clarity and pollution levels
 *    - High visibility = clear atmosphere = better sunsets
 *    - Low visibility often means pollution/haze which can enhance colors paradoxically
 *    - Very low visibility (<1km) blocks too much light
 *
 * 3. Humidity: Affects light scattering and color saturation
 *    - High humidity scatters more light, reducing color intensity
 *    - Low humidity allows more direct light transmission
 *    - Optimal range: 30-60% for vibrant colors
 *
 * 4. Atmospheric Pressure: Indicates weather patterns and atmospheric stability
 *    - High pressure (>1020 hPa): Clear skies, stable conditions, optimal for sunsets
 *    - Normal pressure (1010-1020 hPa): Typical fair weather conditions
 *    - Low pressure (<1010 hPa): Unstable conditions, likely cloudy/stormy
 *    - Very low pressure (<990 hPa): Poor conditions, stormy weather likely
 *
 * The scoring uses a multiplicative approach where each factor can reduce the overall score.
 * This reflects the reality that any single factor can significantly impact sunset quality.
 * Pressure is particularly important as it correlates strongly with overall weather patterns
 * and atmospheric stability that affect all other factors.
 */
function calculateSunsetScore(prediction: PredictionData) {
  let score = 1;
  const cCScore = cloudCoverageScore(prediction);
  const vsScore = visibilityScore(prediction);
  const hScore = humidityScore(prediction);
  const pScore = pressureScore(prediction);
  // TODO: Add air quality score when API supports it
  // Air quality would factor in particulate matter which can enhance sunset colors
  // but also reduce overall visibility and health impacts

  score *= cCScore * vsScore * hScore * pScore;

  return {
    score: Math.round(score * 100),
    cloudCoverage: Math.round(cCScore * 100),
    visibility: Math.round(vsScore * 100),
    humidity: Math.round(hScore * 100),
    pressure: Math.round(pScore * 100),
  };
}

/**
 * Calculate atmospheric pressure impact on sunset quality
 *
 * Atmospheric pressure is a crucial indicator of weather patterns and atmospheric
 * stability that significantly affects sunset quality through multiple mechanisms:
 *
 * 1. Weather Pattern Indication:
 *    - High pressure (1013-1030 hPa): Associated with clear, stable conditions
 *      and descending air masses that suppress cloud formation
 *    - Low pressure (980-1013 hPa): Associated with rising air, increased cloud
 *      formation, and potentially stormy conditions
 *    - Very low pressure (<980 hPa): Often indicates severe weather systems
 *
 * 2. Atmospheric Stability:
 *    - High pressure creates stable atmospheric conditions with minimal turbulence
 *    - Stable air reduces light scattering and allows for clearer, more vibrant sunsets
 *    - Unstable conditions (low pressure) can create atmospheric mixing that
 *      enhances scattering and reduces color intensity
 *
 * 3. Cloud Formation Influence:
 *    - High pressure typically suppresses cloud formation, leading to clearer skies
 *    - Low pressure promotes cloud development, which can block or enhance sunset colors
 *    - The relationship between pressure and clouds is complex and location-dependent
 *
 * 4. Air Quality Correlation:
 *    - High pressure often correlates with better air quality due to descending air
 *    - Low pressure can trap pollutants and create hazy conditions
 *    - Cleaner air allows for more vibrant, less scattered sunset colors
 *
 * 5. Seasonal and Geographic Variations:
 *    - Pressure patterns vary significantly by season and location
 *    - Coastal areas may have different optimal pressure ranges than inland regions
 *    - Altitude affects baseline pressure readings and interpretation
 *
 * Threshold Analysis:
 * - >1020 hPa: Excellent conditions, clear skies, stable atmosphere
 * - 1010-1020 hPa: Good conditions, typical fair weather
 * - 1000-1010 hPa: Fair conditions, some atmospheric instability
 * - 990-1000 hPa: Poor conditions, likely cloudy/unstable
 * - <990 hPa: Very poor conditions, stormy weather likely
 *
 * Scientific Basis:
 * The relationship between pressure and sunset quality is supported by meteorological
 * research showing that high-pressure systems create the most favorable conditions
 * for clear, vibrant sunsets. This is due to the combination of reduced cloud cover,
 * stable atmospheric conditions, and typically cleaner air quality.
 *
 * Note: Pressure alone is not a perfect predictor, but it provides valuable context
 * when combined with other meteorological factors like humidity, visibility, and
 * cloud coverage.
 */
function pressureScore(prediction: PredictionData) {
  // Normalize pressure to sea level if needed (most weather APIs provide this)
  const pressure = prediction.surface_pressure;

  if (pressure > 1020) {
    return 1.0; // Excellent conditions - clear skies, stable atmosphere
  }
  if (pressure > 1010) {
    return 0.95; // Good conditions - typical fair weather
  }
  if (pressure > 1000) {
    return 0.85; // Fair conditions - some atmospheric instability
  }
  if (pressure > 990) {
    return 0.7; // Poor conditions - likely cloudy/unstable
  }
  return 0.5; // Very poor conditions - stormy weather likely
}

/**
 * Calculate humidity impact on sunset quality
 *
 * Humidity affects sunset quality through several mechanisms:
 *
 * 1. Light Scattering: Water vapor molecules scatter sunlight, reducing the intensity
 *    of direct light reaching the observer. This can make colors appear more muted.
 *
 * 2. Rayleigh Scattering: The blue component of sunlight is scattered more than red,
 *    which is why skies appear blue. High humidity can enhance this effect, making
 *    the remaining light more red/orange but potentially less intense.
 *
 * 3. Aerosol Formation: High humidity can lead to the formation of water droplets
 *    and aerosols that further scatter light.
 *
 * 4. Color Saturation: Lower humidity typically results in more vibrant, saturated
 *    colors because there's less atmospheric interference with the light path.
 *
 * Thresholds are based on typical atmospheric conditions:
 * - <40%: Excellent conditions, minimal scattering
 * - 40-60%: Good conditions, slight scattering
 * - 60-80%: Fair conditions, moderate scattering
 * - >80%: Poor conditions, heavy scattering
 *
 * Note: These thresholds may need adjustment based on geographic location and
 * seasonal variations. Desert regions might have different optimal ranges.
 */
function humidityScore(prediction: PredictionData) {
  if (prediction.humidity > 80) {
    return 0.7; // Heavy scattering, muted colors
  }
  if (prediction.humidity > 60) {
    return 0.8; // Moderate scattering
  }
  if (prediction.humidity > 40) {
    return 0.9; // Light scattering
  }
  return 1; // Minimal scattering, optimal conditions
}

/**
 * Calculate visibility impact on sunset quality
 *
 * Visibility is a complex factor that affects sunset quality in multiple ways:
 *
 * 1. Atmospheric Clarity: High visibility indicates clear, clean air with minimal
 *    particulate matter and aerosols. This allows maximum light transmission.
 *
 * 2. Pollution Paradox: Ironically, some air pollution can enhance sunset colors
 *    by scattering light and creating more dramatic red/orange hues. This is why
 *    urban areas often have spectacular sunsets despite poor air quality.
 *
 * 3. Rayleigh Scattering: Clean air scatters blue light more than red, but pollution
 *    can enhance this effect by providing additional scattering particles.
 *
 * 4. Light Path Length: At sunset, light travels through more atmosphere, so any
 *    scattering effects are amplified. This is why sunsets are more colorful than
 *    midday sun.
 *
 * Threshold Analysis:
 * - <10km: Poor visibility, likely heavy pollution or weather conditions
 *   that block too much light despite potential color enhancement
 * - 10-20km: Moderate visibility, some pollution that may enhance colors
 *   while still allowing sufficient light transmission
 * - >20km: Excellent visibility, clear conditions optimal for vibrant sunsets
 *
 * Future improvements could incorporate actual air quality data (PM2.5, PM10)
 * to better model the pollution paradox effect.
 */
function visibilityScore(prediction: PredictionData) {
  if (prediction.visibility < 10000) {
    return 0.7; // Poor visibility, too much light blocking
  }
  if (prediction.visibility < 20000) {
    return 0.9; // Moderate visibility, some pollution enhancement
  }
  return 1; // Excellent visibility, optimal conditions
}

/**
 * Calculate cloud coverage impact on sunset quality
 *
 * Cloud coverage is the most complex factor affecting sunset quality, as different
 * cloud types and heights have dramatically different effects:
 *
 * 1. Low Clouds (0-2km): Stratus, cumulus, stratocumulus
 *    - Generally block direct sunlight, creating dull, gray conditions
 *    - Can completely obscure the sun, preventing any sunset viewing
 *    - High coverage (>40%) typically results in poor sunset quality
 *    - Ideal coverage: 10-20% for some texture without blocking light
 *
 * 2. Mid Clouds (2-6km): Altocumulus, altostratus
 *    - Can enhance sunset colors through light scattering
 *    - Provide interesting textures and patterns
 *    - Moderate coverage (20-40%) often creates spectacular sunsets
 *    - Too much coverage can still block too much light
 *
 * 3. High Clouds (6-12km): Cirrus, cirrostratus, cirrocumulus
 *    - Often create the most dramatic sunset effects
 *    - Cirrus clouds can create "sunset rays" and vibrant colors
 *    - High coverage can enhance without blocking too much light
 *    - Ideal for photography and visual appeal
 *
 * 4. Total Cloud Coverage: Overall atmospheric conditions
 *    - Too little (<10%): May lack interesting elements
 *    - Too much (>90%): Blocks too much light
 *    - Sweet spot: 30-50% for optimal balance
 *
 * The scoring algorithm prioritizes:
 * - Low cloud coverage (inverse relationship)
 * - Moderate total coverage (bell curve around 40%)
 * - Mid/high clouds are currently weighted less but could be enhanced
 *
 * Future improvements could include:
 * - Separate scoring for mid vs high clouds
 * - Cloud type classification (cirrus vs cumulus)
 * - Time-of-day specific adjustments
 */
function cloudCoverageScore(prediction: PredictionData) {
  let score = 1;

  // Calculate overall cloud cover score using a bell curve around 40%
  // This reflects that some clouds are good, but too many block too much light
  if (prediction.cloud_cover > 90 || prediction.cloud_cover < 10) {
    score *= 0.5; // Too much or too little coverage
  } else {
    // Bell curve: optimal at 40%, decreasing as we move away
    score *= 1 - Math.abs(prediction.cloud_cover - 40) / 100;
  }

  // Calculate low cloud cover score (inverse relationship)
  // Low clouds are generally bad for sunsets as they block direct light
  if (prediction.cloud_cover_low > 40) {
    // Heavy penalty for high low cloud coverage
    score *= 1 - prediction.cloud_cover_low / 100 + 0.5;
  } else {
    // Slight penalty for deviation from ideal low coverage (15%)
    score *= 1 - Math.abs(prediction.cloud_cover_low - 15) / 100;
  }

  return score;
}
