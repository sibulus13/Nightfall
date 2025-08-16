import {
  type WeatherForecast,
  type Prediction,
  type PredictionData,
  type AirQualityForecast,
} from "~/lib/sunset/type";

export async function getSunsetPrediction(latitude: number, longitude: number) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset,daylight_duration,sunshine_duration&hourly=temperature_2m,weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,surface_pressure,dew_point_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,uv_index,uv_index_clear_sky,cape&timezone=auto`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,aerosol_optical_depth&current=us_aqi&timezone=auto&forecast_days=7`;
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
 * 5. Particulate Matter: Complex relationship with sunset quality
 *    - Moderate pollution can enhance colors through light scattering
 *    - High pollution reduces visibility and overall quality
 *    - Very low pollution may lack dramatic scattering effects
 *
 * TODO: Additional factors:
 * - Wind speed/direction, temperature gradient, ozone levels
 * - Aerosol optical depth, solar elevation angle
 * - Geographic factors (altitude, latitude, water proximity)
 * - Seasonal adjustments, weather system type
 * - Cloud classification, atmospheric moisture
 * - Air mass characteristics, urban heat island effects
 * - Wildfire smoke, industrial pollution, volcanic aerosols
 * - Saharan dust, marine layer, mountain wave effects
 *
 * TODO: Scoring improvements:
 * - Weighted scoring, seasonal/geographic calibration
 * - Confidence intervals, ML pattern recognition
 * - Ensemble methods, user feedback loop
 * - Historical accuracy, uncertainty quantification
 * - Adaptive thresholds, time-of-day adjustments
 *
 * The scoring uses a multiplicative approach where each factor can reduce the overall score.
 * This reflects the reality that any single factor can significantly impact sunset quality.
 * Pressure is particularly important as it correlates strongly with overall weather patterns
 * and atmospheric stability that affect all other factors.
 */
function calculateSunsetScore(prediction: PredictionData) {
  // Get individual scores
  const cCScore = cloudCoverageScore(prediction);
  const vsScore = visibilityScore(prediction);
  const hScore = humidityScore(prediction);
  const pScore = pressureScore(prediction);
  const partScore = particulateScore(prediction);
  const wScore = windScore(prediction);
  const tScore = temperatureScore(prediction);
  const sScore = stabilityScore(prediction);
  const uScore = uvScore(prediction);
  const aodScore = aerosolOpticalDepthScore(prediction);
  const aqiScore = europeanAQIScore(prediction);
  const o3Score = ozoneScore(prediction);
  const no2Score = nitrogenDioxideScore(prediction);

  const scores_to_use = [
    cCScore,
    vsScore,
    hScore,
    pScore,
    partScore,
    wScore,
    tScore,
  ];
  // Multiplicative scoring for realistic range
  let score = scores_to_use.reduce((acc, curr) => acc * curr, 1);

  // Bonus for excellent conditions
  const excellentFactors = scores_to_use.filter((score) => score >= 0.9).length;
  for (let i = 0; i < excellentFactors; i++) {
    score *= 1.1;
  }

  // Keep score in bounds
  score = Math.max(0.05, Math.min(1.01, score));

  return {
    score: Math.round(score * 100),
    cloudCoverage: Math.round(cCScore * 100),
    visibility: Math.round(vsScore * 100),
    humidity: Math.round(hScore * 100),
    pressure: Math.round(pScore * 100),
    particulate: Math.round(partScore * 100),
    wind: Math.round(wScore * 100),
    temperature: Math.round(tScore * 100),
    stability: Math.round(sScore * 100),
    uv: Math.round(uScore * 100),
    aerosolOpticalDepth: Math.round(aodScore * 100),
    europeanAQI: Math.round(aqiScore * 100),
    ozone: Math.round(o3Score * 100),
    nitrogenDioxide: Math.round(no2Score * 100),
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
 * TODO: Pressure improvements:
 * - Trend analysis, gradient calculations, altitude corrections
 * - Seasonal/geographic adjustments, system classification
 * - Front/trough/ridge effects, cyclone/anticyclone effects
 * - Convergence/divergence, advection, vertical structure
 * - Temporal/spatial patterns, weather correlations
 * - Wind/temperature/humidity/cloud/visibility/aerosol interactions
 * - Urban/topographic/maritime/continental effects
 *
 * Threshold Analysis:
 * - >1020 hPa: Excellent conditions, clear skies, stable atmosphere
 * - 1010-1020 hPa: Good conditions, typical fair weather
 * - 1000-1010 hPa: Fair conditions, some atmospheric instability
 * - 990-1000 hPa: Poor conditions, likely cloudy/unstable
 * - <990 hPa: Very poor conditions, stormy weather likely
 *
 * Current limitations:
 * - No consideration of pressure trends or gradients
 * - No altitude corrections for different locations
 * - No seasonal or geographic adjustments
 * - No integration with weather system types
 * - Simplified threshold approach may not capture complex interactions
 * - No consideration of pressure quality or uniformity
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
    return 0.9; // Fair conditions - some atmospheric instability
  }
  if (pressure > 990) {
    return 0.8; // Poor conditions - likely cloudy/unstable
  }
  if (pressure > 980) {
    return 0.65; // Very poor conditions - stormy weather likely
  }
  return 0.5; // Extremely poor conditions - severe weather
}

/**
 * Calculate particulate matter impact on sunset quality
 *
 * Particulate matter (PM2.5 and PM10) has a complex relationship with sunset quality
 * that involves the "pollution paradox" - some air pollution can actually enhance
 * sunset colors while reducing overall visibility and air quality:
 *
 * 1. Light Scattering Enhancement:
 *    - Fine particles (PM2.5) scatter sunlight more effectively than larger particles
 *    - This scattering can create more dramatic red/orange colors during sunset
 *    - The effect is most pronounced when particles are in the optimal size range
 *
 * 2. Pollution Paradox:
 *    - Moderate pollution levels (10-35 μg/m³ PM2.5) can enhance sunset colors
 *    - High pollution levels (>35 μg/m³ PM2.5) typically reduce visibility too much
 *    - Very low pollution (<5 μg/m³ PM2.5) may lack the scattering needed for dramatic colors
 *
 * 3. Particle Size Effects:
 *    - PM2.5 (≤2.5 μm): Most effective at scattering blue light, enhancing red/orange hues
 *    - PM10 (≤10 μm): Larger particles that can block more light and reduce visibility
 *    - Optimal sunset enhancement occurs with moderate PM2.5 levels
 *
 * 4. Geographic and Seasonal Variations:
 *    - Urban areas often have higher baseline pollution but spectacular sunsets
 *    - Wildfire smoke can create dramatic sunset effects but poor air quality
 *    - Industrial pollution patterns vary by region and season
 *
 * 5. Health vs. Aesthetic Considerations:
 *    - While pollution can enhance sunset colors, it's harmful to health
 *    - The scoring balances aesthetic appeal with air quality concerns
 *    - Very high pollution levels are penalized despite potential color enhancement
 *
 * TODO: Particulate improvements:
 * - Aerosol optical depth, particle size distribution
 * - Composition analysis, source identification
 * - Temporal/spatial patterns, vertical profile
 * - Aging/hygroscopic/coagulation effects
 * - Deposition/transport/transformation effects
 * - Chemical composition, optical properties
 * - Radiative effects, cloud/precipitation interactions
 * - Wind/temperature/humidity/pressure effects
 * - Visibility/color effects, health/environmental impact
 * - Regulatory compliance, forecasting, historical trends
 *
 * Threshold Analysis:
 * - PM2.5 <5 μg/m³: Very clean air, may lack dramatic colors
 * - PM2.5 5-15 μg/m³: Good conditions, some enhancement without health risks
 * - PM2.5 15-35 μg/m³: Moderate pollution, optimal sunset enhancement
 * - PM2.5 35-55 μg/m³: High pollution, reduced visibility despite color enhancement
 * - PM2.5 >55 μg/m³: Very high pollution, poor conditions and health risks
 *
 * Current limitations:
 * - Uses PM2.5/PM10 instead of more precise aerosol optical depth
 * - No consideration of particle composition or source
 * - No integration with particle size distribution
 * - Simplified threshold approach may not capture complex interactions
 * - No seasonal or geographic adjustments
 * - No consideration of particle quality or uniformity
 * - No integration with other atmospheric factors
 *
 * Scientific Basis:
 * The relationship between particulate matter and sunset quality is supported by
 * atmospheric science research on light scattering and the well-documented
 * "pollution paradox" observed in urban areas worldwide.
 *
 * Note: This scoring balances aesthetic appeal with air quality concerns,
 * recognizing that while some pollution can enhance sunset colors, excessive
 * pollution is detrimental to both health and overall viewing experience.
 */
function particulateScore(prediction: PredictionData) {
  const pm2_5 = prediction.pm2_5;
  // const pm10 = prediction.pm10;

  let pm2_5_score = 1 - Math.abs((pm2_5 - 45) / 45) ** 2;
  pm2_5_score = Math.max(0.55, Math.min(1.01, pm2_5_score));

  return pm2_5_score;
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
 * TODO: Humidity improvements:
 * - Dew point temperature, absolute humidity measurements
 * - Gradient analysis, temporal patterns, geographic variations
 * - Seasonal adjustments, temperature/pressure interactions
 * - Wind/cloud/aerosol interactions, condensation/evaporation
 * - Precipitation effects, fog/haze formation
 * - Mirage/refraction/absorption/emission effects
 * - Urban heat island, agricultural/water body/vegetation effects
 *
 * Thresholds are based on typical atmospheric conditions:
 * - <40%: Excellent conditions, minimal scattering
 * - 40-60%: Good conditions, slight scattering
 * - 60-80%: Fair conditions, moderate scattering
 * - >80%: Poor conditions, heavy scattering
 *
 * Current limitations:
 * - Uses relative humidity instead of more accurate dew point
 * - No consideration of humidity gradients or patterns
 * - Simplified threshold approach may not capture complex interactions
 * - No seasonal or geographic adjustments
 * - No consideration of humidity quality or uniformity
 * - No integration with temperature or pressure effects
 */
function humidityScore(prediction: PredictionData) {
  if (prediction.humidity > 85) {
    return 0.5; // Very heavy scattering
  }
  if (prediction.humidity > 70) {
    return 0.65; // Heavy scattering, muted colors
  }
  if (prediction.humidity > 50) {
    return 0.8; // Moderate scattering
  }
  if (prediction.humidity > 30) {
    return 0.9; // Light scattering
  }
  return 1.0; // Minimal scattering, optimal conditions
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
 * TODO: Visibility improvements:
 * - PM2.5/PM10 integration, aerosol optical depth
 * - Extinction coefficient, trend analysis, quality assessment
 * - Depth/color analysis, temporal patterns, geographic variations
 * - Seasonal adjustments, weather correlations, altitude effects
 * - Humidity/temperature/wind interactions, precipitation effects
 * - Fog/mist handling, dust/sand storms, wildfire smoke
 * - Industrial pollution, marine layer, mountain wave effects
 *
 * Threshold Analysis:
 * - <10km: Poor visibility, likely heavy pollution or weather conditions
 *   that block too much light despite potential color enhancement
 * - 10-20km: Moderate visibility, some pollution that may enhance colors
 *   while still allowing sufficient light transmission
 * - >20km: Excellent visibility, clear conditions optimal for vibrant sunsets
 *
 * Current limitations:
 * - Does not distinguish between different types of visibility reduction
 * - No integration with actual air quality measurements
 * - Simplified threshold approach may not capture complex interactions
 * - No consideration of visibility quality or uniformity
 * - No seasonal or geographic adjustments
 */
function visibilityScore(prediction: PredictionData) {
  if (prediction.visibility < 5000) {
    return 0.6; // Very poor visibility
  }
  if (prediction.visibility < 10000) {
    return 0.75; // Poor visibility, but some enhancement possible
  }
  if (prediction.visibility < 20000) {
    return 0.9; // Moderate visibility, some pollution enhancement
  }
  return 1.0; // Excellent visibility, optimal conditions
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
 * TODO: Cloud improvements:
 * - Separate mid/high cloud scoring, cloud type classification
 * - Base height, thickness/density, movement patterns
 * - Edge effects, color analysis, formation patterns
 * - Seasonal/geographic adjustments, optical depth
 * - Particle size distribution, phase effects (ice/water)
 * - Shadow/reflection effects, wind/temperature interactions
 * - Moisture content, aerosol interactions, radiative effects
 *
 * The scoring algorithm prioritizes:
 * - Low cloud coverage (inverse relationship)
 * - Moderate total coverage (bell curve around 40%)
 * - Mid/high clouds are currently weighted less but could be enhanced
 *
 * Current limitations:
 * - Does not distinguish between cloud types
 * - No consideration of cloud movement or patterns
 * - Simplified bell curve approach may not capture complex interactions
 * - No seasonal or geographic adjustments
 * - No consideration of cloud optical properties
 */
function cloudCoverageScore(prediction: PredictionData) {
  let score = 1;

  // Calculate overall cloud cover score using a bell curve around 40%
  // This reflects that some clouds are good, but too many block too much light
  if (prediction.cloud_cover > 90 || prediction.cloud_cover < 10) {
    score *= 0.4; // More realistic penalty - too much or too little coverage
  } else {
    // Bell curve: optimal at 40%, decreasing as we move away
    const deviation = Math.abs(prediction.cloud_cover - 40);
    score *= Math.max(0.5, 1 - deviation / 80); // More realistic penalty, optimal gets 1.0
  }

  // Calculate low cloud cover score (inverse relationship)
  // Low clouds are generally bad for sunsets as they block direct light
  if (prediction.cloud_cover_low > 40) {
    // More realistic penalty for high low cloud coverage
    score *= Math.max(0.3, 1 - prediction.cloud_cover_low / 100 + 0.3);
  } else {
    // More realistic scoring for deviation from ideal low coverage (15%)
    const deviation = Math.abs(prediction.cloud_cover_low - 15);
    score *= Math.max(0.7, 1 - deviation / 100);
  }

  return score;
}

/**
 * Calculate wind impact on sunset quality
 *
 * Wind affects sunset quality through several mechanisms:
 *
 * 1. Cloud Movement: Wind can move clouds into or out of the sunset viewing area
 *    - Light winds (5-15 km/h): Ideal for stable cloud formations
 *    - Moderate winds (15-25 km/h): Can create dynamic cloud patterns
 *    - High winds (>25 km/h): Can clear clouds or create turbulent conditions
 *
 * 2. Atmospheric Stability: Wind patterns indicate atmospheric stability
 *    - Calm conditions: Often associated with stable, clear conditions
 *    - Light breezes: Optimal for sunset viewing
 *    - Strong winds: Can indicate approaching weather systems
 *
 * 3. Aerosol Transport: Wind can transport or disperse atmospheric particles
 *    - Offshore winds: Often bring cleaner air from over water
 *    - Onshore winds: Can bring marine aerosols that enhance colors
 *    - Cross-winds: Can transport pollution or dust
 *
 * 4. Temperature Mixing: Wind affects temperature gradients and atmospheric mixing
 *    - Light winds: Allow temperature stratification that can enhance colors
 *    - Strong winds: Mix atmospheric layers, potentially reducing color intensity
 *
 * Threshold Analysis:
 * - <5 km/h: Calm conditions, optimal for stable viewing
 * - 5-15 km/h: Light breeze, ideal for sunset viewing
 * - 15-25 km/h: Moderate wind, good conditions with some cloud movement
 * - 25-35 km/h: Strong wind, may affect cloud patterns
 * - >35 km/h: Very strong wind, likely poor conditions
 */
function windScore(prediction: PredictionData) {
  const windSpeed = prediction.wind_speed_10m;

  if (windSpeed < 5) {
    return 1.0; // Calm conditions, optimal
  }
  if (windSpeed < 15) {
    return 0.95; // Light breeze, ideal
  }
  if (windSpeed < 25) {
    return 0.9; // Moderate wind, good
  }
  if (windSpeed < 35) {
    return 0.8; // Strong wind, fair
  }
  return 0.6; // Very strong wind, poor
}

/**
 * Calculate temperature impact on sunset quality
 *
 * Temperature affects sunset quality through several mechanisms:
 *
 * 1. Atmospheric Density: Temperature affects air density and light refraction
 *    - Cooler temperatures: Higher air density, more light scattering
 *    - Warmer temperatures: Lower air density, less scattering
 *    - Temperature gradients: Can create mirage effects and enhanced colors
 *
 * 2. Moisture Capacity: Temperature affects atmospheric moisture content
 *    - Cooler air: Can hold less moisture, potentially clearer conditions
 *    - Warmer air: Can hold more moisture, potentially hazier conditions
 *    - Dew point relationship: Critical for understanding actual moisture content
 *
 * 3. Thermal Stability: Temperature affects atmospheric stability
 *    - Cool conditions: Often more stable, clearer skies
 *    - Warm conditions: Can create thermal turbulence
 *    - Temperature inversions: Can trap pollutants and create dramatic effects
 *
 * 4. Seasonal Effects: Temperature patterns vary by season
 *    - Spring/Fall: Often optimal temperature ranges
 *    - Summer: Can be too warm, creating haze
 *    - Winter: Can be too cold, affecting light transmission
 *
 * Threshold Analysis:
 * - <0°C: Very cold, may affect light transmission
 * - 0-10°C: Cool, often clear conditions
 * - 10-20°C: Optimal temperature range
 * - 20-30°C: Warm, good conditions
 * - >30°C: Hot, may create haze
 */
function temperatureScore(prediction: PredictionData) {
  const temperature = prediction.temperature_2m;

  if (temperature < 0) {
    return 0.8; // Very cold, may affect transmission
  }
  if (temperature < 10) {
    return 0.95; // Cool, often clear
  }
  if (temperature < 20) {
    return 1.0; // Optimal range
  }
  if (temperature < 30) {
    return 0.9; // Warm, good
  }
  return 0.7; // Hot, may create haze
}

/**
 * Calculate atmospheric stability impact on sunset quality
 *
 * Atmospheric stability is crucial for sunset quality and can be assessed through:
 *
 * 1. CAPE (Convective Available Potential Energy): Measures atmospheric instability
 *    - Low CAPE (<500 J/kg): Stable conditions, good for sunsets
 *    - Moderate CAPE (500-1000 J/kg): Some instability, can enhance colors
 *    - High CAPE (>1000 J/kg): Unstable, likely stormy conditions
 *
 * 2. CIN (Convective Inhibition): Measures atmospheric stability
 *    - High CIN (>200 J/kg): Very stable, often clear conditions
 *    - Moderate CIN (50-200 J/kg): Stable, good conditions
 *    - Low CIN (<50 J/kg): Less stable, variable conditions
 *
 * 3. Pressure Patterns: High pressure systems are typically more stable
 *    - High pressure: Stable, clear conditions
 *    - Low pressure: Unstable, cloudy conditions
 *
 * 4. Wind Patterns: Calm or light winds indicate stability
 *    - Calm winds: Stable conditions
 *    - Strong winds: Can indicate instability
 *
 * Threshold Analysis:
 * - CAPE <500 J/kg: Stable conditions, optimal
 * - CAPE 500-1000 J/kg: Some instability, good
 * - CAPE >1000 J/kg: Unstable, poor
 * - CIN >200 J/kg: Very stable, excellent
 * - CIN 50-200 J/kg: Stable, good
 * - CIN <50 J/kg: Less stable, variable
 */
function stabilityScore(prediction: PredictionData) {
  const cape = prediction.cape;
  const cin = prediction.cin;

  let score = 1;

  // CAPE scoring (lower is better for stability)
  if (cape > 1000) {
    score *= 0.6; // Very unstable
  } else if (cape > 500) {
    score *= 0.8; // Some instability
  } else {
    score *= 1.0; // Stable
  }

  // CIN scoring (higher is better for stability)
  if (cin > 200) {
    score *= 1.0; // Very stable
  } else if (cin > 50) {
    score *= 0.9; // Stable
  } else {
    score *= 0.7; // Less stable
  }

  return score;
}

/**
 * Calculate UV index impact on sunset quality
 *
 * UV index affects sunset quality through several mechanisms:
 *
 * 1. Light Scattering: UV radiation affects atmospheric scattering patterns
 *    - High UV: More energetic scattering, can enhance colors
 *    - Low UV: Less scattering, potentially more muted colors
 *    - UV vs visible light: Different scattering characteristics
 *
 * 2. Ozone Effects: UV levels correlate with ozone concentrations
 *    - High ozone: Can enhance blue sky colors
 *    - Low ozone: May reduce atmospheric color effects
 *    - Ozone layer thickness: Affects overall light transmission
 *
 * 3. Atmospheric Composition: UV levels indicate atmospheric clarity
 *    - Clear conditions: Higher UV transmission
 *    - Hazy conditions: Lower UV transmission
 *    - Pollution effects: Can block UV radiation
 *
 * 4. Seasonal Patterns: UV levels vary by season and latitude
 *    - Summer: Higher UV, potentially more dramatic colors
 *    - Winter: Lower UV, potentially more subtle colors
 *    - Equatorial regions: Higher UV year-round
 *
 * Threshold Analysis:
 * - UV <2: Low UV, subtle effects
 * - UV 2-5: Moderate UV, good conditions
 * - UV 5-8: High UV, enhanced effects
 * - UV >8: Very high UV, dramatic effects
 */
function uvScore(prediction: PredictionData) {
  const uvIndex = prediction.uv_index;

  if (uvIndex < 2) {
    return 0.8; // Low UV, subtle effects
  }
  if (uvIndex < 5) {
    return 0.9; // Moderate UV, good
  }
  if (uvIndex < 8) {
    return 1.0; // High UV, enhanced
  }
  return 0.95; // Very high UV, dramatic
}

/**
 * Calculate aerosol optical depth impact on sunset quality
 *
 * Aerosol Optical Depth (AOD) is a more precise measure of light extinction
 * by atmospheric aerosols than PM2.5/PM10. It directly measures how much
 * light is scattered or absorbed by particles in the atmosphere.
 *
 * 1. Light Scattering Effects:
 *    - Low AOD (<0.1): Clear conditions, minimal scattering
 *    - Moderate AOD (0.1-0.3): Optimal for dramatic sunsets
 *    - High AOD (0.3-0.5): Enhanced colors but reduced visibility
 *    - Very high AOD (>0.5): Poor conditions, too much light blocking
 *
 * 2. Wavelength Dependence:
 *    - AOD at 400nm: More sensitive to fine particles
 *    - AOD at 1020nm: More sensitive to larger particles
 *    - Sunset colors are most affected by shorter wavelengths
 *
 * Threshold Analysis:
 * - AOD <0.1: Very clear, may lack dramatic colors
 * - AOD 0.1-0.3: Optimal sunset enhancement
 * - AOD 0.3-0.5: Good enhancement, some visibility reduction
 * - AOD >0.5: Poor conditions, too much light blocking
 */
function aerosolOpticalDepthScore(prediction: PredictionData) {
  const aod = prediction.aerosol_optical_depth;

  if (aod > 0.8) {
    return 0.3; // Very high AOD, poor conditions
  }
  if (aod > 0.5) {
    return 0.5; // High AOD, reduced visibility
  }
  if (aod > 0.3) {
    return 0.7; // Moderate AOD, good enhancement
  }
  if (aod > 0.1) {
    return 0.9; // Optimal AOD for sunset enhancement
  }
  return 0.8; // Low AOD, clear but may lack dramatic colors
}

/**
 * Calculate European Air Quality Index impact on sunset quality
 *
 * The European AQI provides a comprehensive measure of air quality
 * that considers multiple pollutants. It affects sunset quality through:
 *
 * 1. Overall Air Quality:
 *    - Low AQI (0-20): Excellent air quality, clear conditions
 *    - Moderate AQI (20-40): Good conditions, some enhancement
 *    - High AQI (40-60): Moderate pollution, optimal enhancement
 *    - Very high AQI (60-80): High pollution, reduced visibility
 *    - Extreme AQI (>80): Poor conditions, health risks
 *
 * 2. Multi-Pollutant Consideration:
 *    - Combines PM2.5, PM10, NO2, O3, SO2
 *    - Provides more comprehensive assessment than individual pollutants
 *    - Better correlation with actual air quality perception
 *
 * Threshold Analysis:
 * - AQI 0-20: Excellent air quality, may lack dramatic colors
 * - AQI 20-40: Good conditions, some enhancement
 * - AQI 40-60: Optimal pollution levels for sunset enhancement
 * - AQI 60-80: High pollution, reduced visibility
 * - AQI >80: Poor conditions, health risks
 */
function europeanAQIScore(prediction: PredictionData) {
  const aqi = prediction.european_aqi;

  if (aqi > 80) {
    return 0.3; // Extreme AQI, poor conditions
  }
  if (aqi > 60) {
    return 0.5; // Very high AQI, reduced visibility
  }
  if (aqi > 40) {
    return 0.8; // High AQI, good enhancement
  }
  if (aqi > 20) {
    return 0.9; // Moderate AQI, optimal enhancement
  }
  return 0.8; // Low AQI, excellent air quality
}

/**
 * Calculate ozone impact on sunset quality
 *
 * Ozone affects sunset quality through several mechanisms:
 *
 * 1. Light Scattering:
 *    - Ozone molecules scatter blue light more than red
 *    - This can enhance red/orange sunset colors
 *    - High ozone levels can create more dramatic effects
 *
 * 2. Atmospheric Composition:
 *    - Ozone is a key component of photochemical smog
 *    - Correlates with other air quality indicators
 *    - Indicates atmospheric stability and composition
 *
 * 3. Health vs. Aesthetic Balance:
 *    - High ozone can enhance sunset colors
 *    - But it's harmful to health and indicates poor air quality
 *    - Scoring balances aesthetic appeal with air quality concerns
 *
 * Threshold Analysis:
 * - O3 <30 μg/m³: Low ozone, may lack dramatic colors
 * - O3 30-60 μg/m³: Moderate ozone, good enhancement
 * - O3 60-100 μg/m³: High ozone, optimal enhancement
 * - O3 100-150 μg/m³: Very high ozone, reduced visibility
 * - O3 >150 μg/m³: Extreme ozone, poor conditions
 */
function ozoneScore(prediction: PredictionData) {
  const ozone = prediction.ozone;

  if (ozone > 150) {
    return 0.4; // Extreme ozone, poor conditions
  }
  if (ozone > 100) {
    return 0.6; // Very high ozone, reduced visibility
  }
  if (ozone > 60) {
    return 0.9; // High ozone, optimal enhancement
  }
  if (ozone > 30) {
    return 0.8; // Moderate ozone, good enhancement
  }
  return 0.7; // Low ozone, may lack dramatic colors
}

/**
 * Calculate nitrogen dioxide impact on sunset quality
 *
 * Nitrogen dioxide (NO2) affects sunset quality through:
 *
 * 1. Light Absorption:
 *    - NO2 absorbs blue light, enhancing red/orange colors
 *    - Creates characteristic urban sunset colors
 *    - High levels can create dramatic but unhealthy conditions
 *
 * 2. Urban Pollution Indicator:
 *    - Primary source is vehicle emissions
 *    - Correlates with overall urban air quality
 *    - Indicates traffic-related pollution patterns
 *
 * 3. Health Considerations:
 *    - NO2 is harmful to respiratory health
 *    - High levels indicate poor air quality
 *    - Scoring balances aesthetic appeal with health concerns
 *
 * Threshold Analysis:
 * - NO2 <20 μg/m³: Low NO2, may lack dramatic colors
 * - NO2 20-40 μg/m³: Moderate NO2, good enhancement
 * - NO2 40-80 μg/m³: High NO2, optimal enhancement
 * - NO2 80-120 μg/m³: Very high NO2, reduced visibility
 * - NO2 >120 μg/m³: Extreme NO2, poor conditions
 */
function nitrogenDioxideScore(prediction: PredictionData) {
  const no2 = prediction.nitrogen_dioxide;

  if (no2 > 120) {
    return 0.4; // Extreme NO2, poor conditions
  }
  if (no2 > 80) {
    return 0.6; // Very high NO2, reduced visibility
  }
  if (no2 > 40) {
    return 0.9; // High NO2, optimal enhancement
  }
  if (no2 > 20) {
    return 0.8; // Moderate NO2, good enhancement
  }
  return 0.7; // Low NO2, may lack dramatic colors
}
