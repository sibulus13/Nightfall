import { type WeatherForecast, type AirQualityForecast, type Prediction } from "~/lib/sunset/type";
import { calculateSunsetPredictions } from "~/lib/sunset/interpolation";

export async function getSunsetPrediction(latitude: number, longitude: number) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset,daylight_duration,sunshine_duration&hourly=temperature_2m,weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,surface_pressure,dew_point_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,uv_index,uv_index_clear_sky,cape&timezone=auto&forecast_days=6`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,aerosol_optical_depth&current=us_aqi&timezone=auto&forecast_days=6`;

  const [weatherRes, airQualityRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(airQualityUrl),
  ]);

  if (weatherRes.status === 429 || airQualityRes.status === 429) {
    throw new Error("429 Too Many Requests");
  }
  if (!weatherRes.ok) throw new Error(`HTTP error! status: ${weatherRes.status}`);
  if (!airQualityRes.ok) throw new Error(`HTTP error! status: ${airQualityRes.status}`);

  const weatherForecast = (await weatherRes.json()) as WeatherForecast;
  const airQualityForecast = (await airQualityRes.json()) as AirQualityForecast;

  return calculateSunsetPredictions(weatherForecast, airQualityForecast) as unknown as Prediction[];
}
