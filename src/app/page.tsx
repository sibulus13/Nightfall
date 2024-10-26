import { useEffect, useState } from "react";
import useSWR from "swr";
import { calculateSunsetPredictions } from "~/lib/sunset/sunset";
import { type WeatherForecast, type Prediction } from "~/lib/sunset/type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Sun, Clock, Hourglass } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// type SunsetPrediction = {
//   date: string;
//   score: number;
//   sunsetTime: string;
//   goldenHourStart: string;
//   goldenHourEnd: string;
// };

// const sunsetData: SunsetPrediction[] = [
//   {
//     date: "2024-10-25",
//     score: 0,
//     sunsetTime: "18:32",
//     goldenHourStart: "17:50",
//     goldenHourEnd: "18:32",
//   },
//   {
//     date: "2024-10-26",
//     score: 50,
//     sunsetTime: "18:30",
//     goldenHourStart: "17:49",
//     goldenHourEnd: "18:30",
//   },
//   {
//     date: "2024-10-27",
//     score: 100,
//     sunsetTime: "18:29",
//     goldenHourStart: "17:48",
//     goldenHourEnd: "18:29",
//   },
//   {
//     date: "2024-10-28",
//     score: 25,
//     sunsetTime: "18:27",
//     goldenHourStart: "17:47",
//     goldenHourEnd: "18:27",
//   },
//   {
//     date: "2024-10-29",
//     score: 75,
//     sunsetTime: "18:26",
//     goldenHourStart: "17:46",
//     goldenHourEnd: "18:26",
//   },
//   {
//     date: "2024-10-30",
//     score: 88,
//     sunsetTime: "18:24",
//     goldenHourStart: "17:45",
//     goldenHourEnd: "18:24",
//   },
// ];

const getScoreGradient = (score: number) => {
  const baseColors = [
    "from-orange-300 via-pink-400 to-purple-500",
    "from-yellow-200 via-orange-300 to-red-400",
    "from-blue-300 via-purple-400 to-pink-500",
  ];
  const randomGradient =
    baseColors[Math.floor(Math.random() * baseColors.length)];
  const saturation = score; // Use score directly for saturation
  return `${randomGradient} saturate-[${saturation}%]`;
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString([], options);
};

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Normalize score to a range between 13 and 93
const truncateScore = (score: number, lowerLimit = 0, upperLimit = 93) => {
  const range = upperLimit - lowerLimit;
  score = (score / 100) * range + lowerLimit;
  return score.toFixed(0);
};

export default async function Component() {
  // Removed: const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const latitude = 49.1913033;
  const longitude = -122.849143;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=weather_code,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility&daily=sunrise,sunset,daylight_duration,sunshine_duration`;
  console.log(url);
  const res = await fetch(url);
  const forecast = (await res.json()) as WeatherForecast;
  const predictions = calculateSunsetPredictions(forecast) as Prediction[];
  console.log(predictions[0]);

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4">
        <h1 className="mb-6 text-center text-3xl font-bold text-primary">
          Sunset Prediction Dashboard
        </h1>
        <div className="flex flex-col gap-4 overflow-x-auto pb-4 lg:flex-row">
          {" "}
          {/* Removed group class */}
          {predictions.map((prediction) => (
            <Card
              key={prediction.date}
              className={`w-full flex-shrink-0 bg-gradient-to-br lg:w-1/6 ${getScoreGradient(prediction.score)} peer h-full transition-all duration-300 ease-in-out hover:z-10 hover:scale-105 peer-hover:opacity-50`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  {formatDate(prediction.date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex h-full flex-col justify-between">
                <div className="flex flex-col items-center">
                  <Sun className="mb-2 h-12 w-12 text-yellow-500" />
                  <span className="text-4xl font-bold">
                    {truncateScore(prediction.score.score)}
                  </span>
                  <span className="text-sm font-medium">Sunset Score</span>
                </div>
                <div className="mt-4 flex justify-end space-x-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs">
                          {formatTime(prediction.sunset)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sunset Time</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-1">
                        <Hourglass className="h-4 w-4 text-primary" />
                        <span className="text-xs">
                          {formatTime(prediction.golden_hour.start)} -{" "}
                          {formatTime(prediction.golden_hour.end)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Golden Hour</p>
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
