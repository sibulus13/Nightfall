"use client";
import { useEffect } from "react";
import { type Prediction } from "~/lib/sunset/type";
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
import { type Place } from "~/types/location";
import { getSunsetPrediction } from "~/lib/sunset/sunset";

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
  const dispatch = useDispatch();
  const prediction = useSelector(
    (state: { prediction: { prediction: Prediction[] } }) =>
      state.prediction.prediction,
  );

  async function predict(lat: Number, lon: Number) {
    localStorage.setItem("lat", lat.toString());
    localStorage.setItem("lon", lon.toString());
    const predictions = await getSunsetPrediction(lat, lon);
    dispatch({
      type: "prediction/setPrediction",
      payload: predictions,
    });
  }
  async function setPlace(place: Place) {
    const lat = place?.geometry?.location?.lat();
    const lon = place?.geometry?.location?.lng();
    await predict(lat, lon);
  }

  async function setUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        await predict(lat, lon);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  useEffect(() => {
    if (!prediction) {
      const lat = Number(localStorage.getItem("lat"));
      const lon = Number(localStorage.getItem("lon"));
      if (lat && lon) {
        predict(lat, lon);
      }
    }
  }, []);

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
          {prediction.map((entry) => (
            <Card
              key={entry.date}
              className={`bg-gradient-to-br ${getScoreGradient(entry.score.score).color} transition-all duration-300 ease-in-out hover:scale-105 hover:!opacity-100 group-hover:opacity-60`}
              style={{
                filter: `saturate(${getScoreGradient(entry.score.score).saturation}%)`,
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  {formatDate(entry.sunset + "Z")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <WeatherDisplay
                    weatherCode={entry.weather_code.interpolate}
                  />
                  <div className="flex items-center justify-center">
                    <TbSunset2 className="mb-2 h-12 w-12 text-yellow-300" />
                    <span className="text-4xl font-bold">
                      {truncateScore(entry.score.score) + "%"}
                    </span>
                  </div>
                </div>
                <div className="flex justify-center gap-1 pt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1">
                        <Hourglass className="h-6 w-6 text-yellow-300" />
                        <span className="text-sm">
                          {formatTime(entry.golden_hour.start)}
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
                          {formatTime(entry.sunset + "Z")}
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
