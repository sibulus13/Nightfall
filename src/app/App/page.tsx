"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  function handleLocationClick() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  const searchParams = useSearchParams();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const [latitude, setLatitude] = useState<string | null>(
    lat ?? localStorage.getItem("latitude"),
  );
  const [longitude, setLongitude] = useState<string | null>(
    lng ?? localStorage.getItem("longitude"),
  );
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  async function getSunsetPrediction() {
    if (!latitude || !longitude) {
      return;
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
    const res = await fetch(url);
    const forecast = (await res.json()) as WeatherForecast;
    const predictions = calculateSunsetPredictions(forecast) as Prediction[];
    // console.log(predictions[0]);
    setPredictions(predictions);
  }

  useEffect(() => {
    getSunsetPrediction();
    localStorage.setItem("latitude", latitude);
    localStorage.setItem("longitude", longitude);
  }, [latitude, longitude, selectedPlace]);

  return (
    <TooltipProvider>
      <div className="page justify-center">
        <div className="flex gap-2 p-2 py-4">
          <Locator
            setSelectedPlace={setSelectedPlace}
            handleLocationClick={handleLocationClick}
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
