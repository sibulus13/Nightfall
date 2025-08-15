import { type NextRequest } from "next/server";
import {
  type WeatherForecast,
  type AirQualityForecast,
} from "~/lib/sunset/type";

// fetches the weather forecast and air quality for a given location via open-meteo
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latitude = searchParams.get("lat");
  const longitude = searchParams.get("lon");

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,surface_pressure,temperature_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,cape,cin,uv_index,uv_index_clear_sky&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,aerosol_optical_depth_400nm,aerosol_optical_depth_1020nm&current=us_aqi&timezone=auto&forecast_days=7`;

  try {
    // Fetch both weather and air quality data in parallel
    const [weatherRes, airQualityRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airQualityUrl),
    ]);

    if (!weatherRes.ok) {
      console.error(weatherRes.statusText);
      throw new Error("Failed to fetch weather forecast data");
    }

    if (!airQualityRes.ok) {
      console.error(airQualityRes.statusText);
      throw new Error("Failed to fetch air quality data");
    }

    const weatherForecast: WeatherForecast =
      (await weatherRes.json()) as WeatherForecast;
    const airQualityForecast: AirQualityForecast =
      (await airQualityRes.json()) as AirQualityForecast;

    // Combine the data
    const combinedData = {
      ...weatherForecast,
      airQuality: airQualityForecast,
    };
    
    return Response.json(combinedData);
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return Response.json({ error: "Failed to fetch forecast data" });
  }
}
