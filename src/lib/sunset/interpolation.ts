import { type WeatherForecast, type AirQualityForecast } from "~/lib/sunset/type";
import { calculateSunsetScore } from "~/lib/sunset/scoring";

export function calculateSunsetPredictions(
  forecast: WeatherForecast,
  airQualityForecast?: AirQualityForecast,
) {
  const predictions = [];
  const numberOfDays = forecast.daily?.time?.length ?? 0;

  for (let i = 0; i < numberOfDays; i++) {
    const sunsetTime = forecast?.daily?.sunset[i];
    if (!sunsetTime) {
      console.error("Error: Sunset time is undefined for", forecast.daily.time[i]);
      continue;
    }

    const startTime: string = sunsetTime.slice(0, -2) + "00";
    const sunset_start_hourly_index: number = forecast.hourly.time.findIndex(
      (time: string) => time === startTime,
    );

    if (sunset_start_hourly_index === -1) {
      console.error("Error: Sunset time not found in hourly forecast for", forecast.daily.time[i]);
      continue;
    }

    const sunset_end_hourly_index = sunset_start_hourly_index + 1;
    const interpolateRatio = Number(forecast?.daily?.sunset[i]?.slice(-2)) / 60;

    let pm10 = 0;
    let pm2_5 = 0;
    let european_aqi = 0;
    let ozone = 0;
    let nitrogen_dioxide = 0;
    let aerosol_optical_depth = 0;

    if (airQualityForecast?.hourly) {
      if (airQualityForecast.hourly.pm10?.[sunset_start_hourly_index] !== undefined) {
        pm10 = interpolate(
          airQualityForecast.hourly.pm10[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.pm10[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }
      if (airQualityForecast.hourly.pm2_5?.[sunset_start_hourly_index] !== undefined) {
        pm2_5 = interpolate(
          airQualityForecast.hourly.pm2_5[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.pm2_5[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }
      if (airQualityForecast.hourly.european_aqi?.[sunset_start_hourly_index] !== undefined) {
        european_aqi = interpolate(
          airQualityForecast.hourly.european_aqi[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.european_aqi[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }
      if (airQualityForecast.hourly.ozone?.[sunset_start_hourly_index] !== undefined) {
        ozone = interpolate(
          airQualityForecast.hourly.ozone[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.ozone[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }
      if (airQualityForecast.hourly.nitrogen_dioxide?.[sunset_start_hourly_index] !== undefined) {
        nitrogen_dioxide = interpolate(
          airQualityForecast.hourly.nitrogen_dioxide[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.nitrogen_dioxide[sunset_end_hourly_index] ?? 0,
          interpolateRatio,
        );
      }
      if (airQualityForecast.hourly.aerosol_optical_depth?.[sunset_start_hourly_index] !== undefined) {
        aerosol_optical_depth = interpolate(
          airQualityForecast.hourly.aerosol_optical_depth[sunset_start_hourly_index] ?? 0,
          airQualityForecast.hourly.aerosol_optical_depth[sunset_end_hourly_index] ?? 0,
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
      sunset_start_hourly_index,
      sunset_end_hourly_index,
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
        forecast.hourly.precipitation_probability?.[sunset_start_hourly_index] ?? 0,
        forecast.hourly.precipitation_probability?.[sunset_end_hourly_index] ?? 0,
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
      pm10,
      pm2_5,
      european_aqi,
      aerosol_optical_depth,
      ozone,
      nitrogen_dioxide,
    };

    const sunsetScore = calculateSunsetScore(prediction);
    predictions.push({
      score: sunsetScore.score,
      golden_hour: prediction.golden_hour,
      weather_code: prediction.weather_code,
      sunset_time: prediction.sunset,
      scores: sunsetScore,
      cloud_cover: prediction.cloud_cover,
      cloud_cover_low: prediction.cloud_cover_low,
      cloud_cover_mid: prediction.cloud_cover_mid,
      cloud_cover_high: prediction.cloud_cover_high,
      visibility: prediction.visibility,
      humidity: prediction.humidity,
      surface_pressure: prediction.surface_pressure,
      temperature_2m: prediction.temperature_2m,
      dew_point_2m: prediction.dew_point_2m,
      wind_speed_10m: prediction.wind_speed_10m,
      wind_direction_10m: prediction.wind_direction_10m,
      precipitation_probability: prediction.precipitation_probability,
      cape: prediction.cape,
      cin: prediction.cin,
      uv_index: prediction.uv_index,
      uv_index_clear_sky: prediction.uv_index_clear_sky,
      pm10: prediction.pm10,
      pm2_5: prediction.pm2_5,
      european_aqi: prediction.european_aqi,
      aerosol_optical_depth: prediction.aerosol_optical_depth,
      ozone: prediction.ozone,
      nitrogen_dioxide: prediction.nitrogen_dioxide,
    });
  }

  return predictions;
}

function calculateGoldenHour(sunset: string, daylight_duration: number) {
  const goldenHourDuration = (daylight_duration / 60 / 12) * 0.9;
  const sunsetDate = new Date(sunset);
  const goldenHour = new Date(sunsetDate.getTime());
  goldenHour.setMinutes(goldenHour.getMinutes() - goldenHourDuration);
  return { start: goldenHour.toISOString(), end: sunset };
}

export function interpolate(start: number, end: number, ratio: number, type?: string): number {
  if (type === "closest") return ratio <= 0.5 ? start : end;
  return start + (end - start) * ratio;
}
