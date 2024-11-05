"use client";
import { useEffect, useState } from "react";
import { calculateSunsetPredictions } from "~/lib/sunset/sunset";
import { type WeatherForecast, type Prediction } from "~/lib/sunset/type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Hourglass } from "lucide-react";
import { BsSunset } from "react-icons/bs";
import { TbSunset2 } from "react-icons/tb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import WeatherDisplay from "~/components/weatherDisplay";
import Locator from "~/components/locator";
import { useSelector, useDispatch } from "react-redux";
import { Location, Place } from "~/types/location";

const getScoreGradient = (score: number) => {
  const baseColors = ["from-orange-300 via-pink-400 to-purple-500"];
  const saturation = score; // Use score directly for saturation
  return { color: `${baseColors[0]}`, saturation: saturation };
};

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// If the new date is today, display "Today" instead of the date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  if (date.getDate() === today.getDate()) {
    return "Today";
  } else {
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
};

// Normalize score to a range between 13 and 93
const truncateScore = (score: number, lowerLimit = 0, upperLimit = 93) => {
  const range = upperLimit - lowerLimit;
  score = (score / 100) * range + lowerLimit;
  return score.toFixed(0);
};

export default function AppPage() {
  function setPlace(place: Place) {
    const lat = place?.geometry?.location?.lat();
    const lon = place?.geometry?.location?.lng();
    dispatch({
      type: "location/setLocation",
      payload: {
        lat: lat,
        lon: lon,
      },
    });
    localStorage.setItem("lat", lat);
    localStorage.setItem("lon", lon);
  }

  function setUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        dispatch({
          type: "location/setLocation",
          payload: {
            lat: lat,
            lon: lon,
          },
        });
        localStorage.setItem("lat", lat);
        localStorage.setItem("lon", lon);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  const dispatch = useDispatch();
  const location = useSelector(
    (state: { location: Location }) => state.location,
  );
  const latitude = location.location.lat;
  const longitude = location.location.lon;
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  async function getSunsetPrediction() {
    if (!latitude || !longitude) {
      return;
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
    const res = await fetch(url);
    const forecast = (await res.json()) as WeatherForecast;
    const predictions = calculateSunsetPredictions(forecast) as Prediction[];
    setPredictions(predictions);
    dispatch({
      type: "location/resetLocation",
    });
  }

  useEffect(() => {
    getSunsetPrediction();
  }, [latitude, longitude]);

  return (
    <TooltipProvider>
      <div className="page justify-center">
        <div className="flex gap-2 p-2 py-4">
          <Locator
            setSelectedPlace={setPlace}
            handleLocationClick={setUserLocation}
          />
        </div>

        <div className="group grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {predictions.map((prediction) => (
            <Card
              key={prediction.date}
              className={`bg-gradient-to-br ${getScoreGradient(prediction.score.score).color} transition-all duration-300 ease-in-out hover:scale-105 hover:!opacity-100 group-hover:opacity-60`}
              style={{
                filter: `saturate(${getScoreGradient(prediction.score.score).saturation}%)`,
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  {formatDate(prediction.sunset + "Z")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <WeatherDisplay
                    weatherCode={prediction.weather_code.interpolate}
                  />
                  <div className="flex items-center justify-center">
                    <TbSunset2 className="mb-2 h-12 w-12 text-yellow-300" />
                    <span className="text-4xl font-bold">
                      {truncateScore(prediction.score.score) + "%"}
                    </span>
                  </div>
                </div>
                <div className="flex justify-center gap-1 pt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1">
                        <Hourglass className="h-6 w-6 text-yellow-300" />
                        <span className="text-sm">
                          {formatTime(prediction.golden_hour.start)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Golden Hour Start</p>
                    </TooltipContent>
                  </Tooltip>
                  -
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1">
                        <BsSunset className="h-6 w-6 text-orange-300" />
                        <span className="text-sm">
                          {formatTime(prediction.sunset + "Z")}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sunset Time</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
