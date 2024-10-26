import { type NextRequest } from "next/server";
import { type WeatherForecast } from "~/lib/sunset/type";

// fetches the weather forecast for a given location via open-meteo
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latitude = searchParams.get("lat");
  const longitude = searchParams.get("lon");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
  // console.log(url);
  // const airQualityURL = `https://api.open-meteo.com/v1/airquality?latitude=${latitude}&longitude=${longitude}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(res.statusText);
      throw new Error("Failed to fetch forecast data");
    }
    const weatherForecast: WeatherForecast =
      (await res.json()) as WeatherForecast;

    return Response.json(weatherForecast);
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return Response.json({ error: "Failed to fetch forecast data" });
  }
}
