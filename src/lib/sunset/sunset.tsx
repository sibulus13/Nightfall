import {
  type WeatherForecast,
  type Prediction,
  type PredictionData,
} from "~/lib/sunset/type";

export async function getSunsetPrediction(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
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
      // ...prediction,
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
  const sunsetDate = new Date(sunset + "Z"); // set as UTC
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

// Calculate the sunset score based on the prediction
function calculateSunsetScore(prediction: PredictionData) {
  let score = 1;
  const cCScore = cloudCoverageScore(prediction);
  const vsScore = visibilityScore(prediction);
  const hScore = humidityScore(prediction);
  // TODO calculate air quality score
  score *= cCScore * vsScore * hScore;

  return {
    score: Math.round(score * 100),
    cloudCoverage: Math.round(cCScore * 100),
    visibility: Math.round(vsScore * 100),
    humidity: Math.round(hScore * 100),
  };
}

// Calculate the humidity score based on the prediction
// Inverse relationship between humidity and sunset quality
function humidityScore(prediction: PredictionData) {
  if (prediction.humidity > 80) {
    return 0.7;
  }
  if (prediction.humidity > 60) {
    return 0.8;
  }
  if (prediction.humidity > 40) {
    return 0.9;
  }
  return 1;
}

function visibilityScore(prediction: PredictionData) {
  // TODO finetune these thresholds
  // How does air pollution affect visibility? Since air pollution makes for more vibrant sunsets
  // Obviously too little visibility is bad
  // Lets assume that 10km visibility is the threshold
  // and 30km visibility is the threshold
  if (prediction.visibility < 10000) {
    return 0.7;
  }
  if (prediction.visibility < 20000) {
    return 0.9;
  }
  return 1;
}

function cloudCoverageScore(prediction: PredictionData) {
  // Sunset is affected by cloud coverage split by low vs mid/high clouds
  // Too much low cloud coverage (>50%) is bad
  // Some mid/high cloud coverage (cirrus) can be good
  // Lets assume that 50% low cloud coverage is the threshold
  // and 40% mid/high cloud coverage is the threshold
  // TODO finetune these thresholds
  let score = 1;
  // calculate overall cloud cover score
  // Too little or too much cloud coverage is bad
  // The ideal cloud coverage is around 40%
  if (prediction.cloud_cover > 90 || prediction.cloud_cover < 10) {
    score *= 0.5;
  } else {
    score *= 1 - Math.abs(prediction.cloud_cover - 40) / 100;
  }

  // calculate low cloud cover score
  // Form an inverse relationship between low cloud coverage and sunset quality
  // Assuming Cloud coverage above 40% is bad
  // Assuming ideal low cloud coverage is around 15%
  // TODO finetune these thresholds
  if (prediction.cloud_cover_low > 40) {
    score *= 1 - prediction.cloud_cover_low / 100 + 0.5;
  } else {
    score *= 1 - Math.abs(prediction.cloud_cover_low - 15) / 100;
  }

  return score;
}
