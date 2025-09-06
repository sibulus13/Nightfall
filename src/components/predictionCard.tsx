import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { type Prediction } from "~/lib/sunset/type";
import { Hourglass, ArrowLeft } from "lucide-react";
import { BsSunset } from "react-icons/bs";
import { TbSunset2 } from "react-icons/tb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import WeatherDisplay from "~/components/weatherDisplay";
import { formatDate, formatTime } from "~/lib/time/helper";

interface PredictionCardProps {
  prediction: Prediction;
  onMapClick: () => void;
  getScoreGradient: (score: number) => { color: string; saturation: number };
  truncateScore: (score: number) => string;
}

export default function PredictionCard({
  prediction,
  onMapClick,
  getScoreGradient,
  truncateScore,
}: PredictionCardProps) {
  const [isDetailed, setIsDetailed] = useState(false);

  const formatVisibility = (visibility: number) => {
    if (visibility >= 1000) {
      return `${(visibility / 1000).toFixed(1)} km`;
    }
    return `${visibility.toFixed(0)} m`;
  };

  const formatPressure = (pressure: number) => {
    return `${pressure.toFixed(0)} hPa`;
  };

  const handleClick = () => {
    if (isDetailed) {
      // Second click when in detailed view - go to map
      onMapClick();
    } else {
      // First click - show detailed view
      setIsDetailed(true);
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailed(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          className={`bg-gradient-to-br ${getScoreGradient(prediction.score).color} cursor-pointer transition-all duration-500 ease-in-out hover:!opacity-100 group-hover:opacity-60 ${
            isDetailed ? "ring-2 ring-orange-500" : ""
          }`}
          style={{
            filter: `saturate(${getScoreGradient(prediction.score).saturation}%)`,
          }}
          onClick={handleClick}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              {formatDate(prediction.sunset_time)}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[250px] flex-1 flex-col">
            {/* Basic View */}
            <div
              className={`flex h-full w-full flex-col justify-between p-6 transition-all duration-500 ease-in-out ${
                isDetailed ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              {/* Score and Weather Section */}
              <div className="flex flex-1 items-center justify-between">
                <WeatherDisplay weatherCode={prediction.weather_code} />
                <div className="flex flex-col items-center justify-center">
                  <TbSunset2 className="mb-3 h-16 w-16 text-yellow-300" />
                  <span className="text-4xl font-bold">
                    {truncateScore(prediction.score) + "%"}
                  </span>
                </div>
              </div>

              {/* Time Info Section */}
              <div className="flex items-center justify-center gap-3 pt-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 rounded-lg bg-white/10 px-3 py-2">
                      <Hourglass className="h-4 w-4 text-yellow-300" />
                      <span className="text-sm font-medium">
                        {formatTime(prediction.golden_hour.start)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Golden Hour Start</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-white/50">-</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 rounded-lg bg-white/10 px-3 py-2">
                      <BsSunset className="h-4 w-4 text-orange-300" />
                      <span className="text-sm font-medium">
                        {formatTime(prediction.sunset_time)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sunset Time</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Detailed View */}
            <div
              className={`absolute inset-0 flex flex-col justify-between p-6 transition-all duration-500 ease-in-out ${
                isDetailed ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {/* Back button at top */}
              <div className="flex justify-end">
                <button
                  onClick={handleBackClick}
                  className="flex items-center gap-1 text-xs text-white/80 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
              </div>

              {/* Compact Score Breakdown */}
              <div className="space-y-1">
                <div className="mb-1 text-center text-xs font-medium text-white/90">
                  Factor Scores
                </div>

                {/* Cloud Coverage Section */}
                <div className="mb-2">
                  <div className="mb-1 text-center text-xs font-medium text-white/90">
                    Cloud Coverage
                  </div>
                  <div className="grid grid-cols-5 gap-x-2 text-xs">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <span className="text-white/80">Low</span>
                          <span className="text-xs text-white/70">
                            {prediction.cloud_cover_low.toFixed(0)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Low Cloud Coverage</p>
                        <p className="text-xs text-gray-300">
                          Clouds below 2km altitude
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <span className="text-white/80">Mid</span>
                          <span className="text-xs text-white/70">
                            {prediction.cloud_cover_mid.toFixed(0)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mid Cloud Coverage</p>
                        <p className="text-xs text-gray-300">
                          Clouds between 2-6km altitude
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <span className="text-white/80">High</span>
                          <span className="text-xs text-white/70">
                            {prediction.cloud_cover_high.toFixed(0)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>High Cloud Coverage</p>
                        <p className="text-xs text-gray-300">
                          Clouds above 6km altitude
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <span className="text-white/80">Total</span>
                          <span className="text-xs text-white/70">
                            {prediction.cloud_cover.toFixed(0)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total Cloud Coverage</p>
                        <p className="text-xs text-gray-300">
                          Total cloud cover (%)
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex flex-col items-center">
                      <span className="text-white/80">Score</span>
                      <span className="font-bold text-white">
                        {prediction.scores.cloudCoverage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Factors - Only showing scores used in calculation */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Visibility</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-white">
                            {prediction.scores.visibility}%
                          </span>
                          <span className="text-xs text-white/70">
                            {formatVisibility(prediction.visibility)}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Visibility Score</p>
                      <p className="text-xs text-gray-300">
                        Based on visibility (meters/km)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Humidity</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-white">
                            {prediction.scores.humidity}%
                          </span>
                          <span className="text-xs text-white/70">
                            {prediction.humidity.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Humidity Score</p>
                      <p className="text-xs text-gray-300">
                        Based on relative humidity (%)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Pressure</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-white">
                            {prediction.scores.pressure}%
                          </span>
                          <span className="text-xs text-white/70">
                            {formatPressure(prediction.surface_pressure)}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pressure Score</p>
                      <p className="text-xs text-gray-300">
                        Based on surface pressure (hPa)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Particulate</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-white">
                            {prediction.scores.particulate}%
                          </span>
                          <span className="text-xs text-white/70">
                            {prediction.pm2_5?.toFixed(1) || "N/A"} μg/m³
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Particulate Score</p>
                      <p className="text-xs text-gray-300">
                        Based on PM2.5 (μg/m³)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Wind</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-white">
                            {prediction.scores.wind}%
                          </span>
                          <span className="text-xs text-white/70">
                            {prediction.wind_speed_10m?.toFixed(1) || "N/A"}{" "}
                            km/h
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Wind Score</p>
                      <p className="text-xs text-gray-300">
                        Based on wind speed (km/h)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Temperature</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-white">
                            {prediction.scores.temperature}%
                          </span>
                          <span className="text-xs text-white/70">
                            {prediction.temperature_2m?.toFixed(1) || "N/A"}°C
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Temperature Score</p>
                      <p className="text-xs text-gray-300">
                        Based on temperature (°C)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Overall Score */}
                <div className="mt-2 border-t border-white/20 pt-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">Overall</span>
                        <span className="text-lg font-bold text-yellow-300">
                          {prediction.scores.score}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Overall Sunset Quality Score</p>
                      <p className="text-xs text-gray-300">
                        Combined score from all factors
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Click Instructions */}
              <div className="text-center text-xs italic text-white/70">
                Click to view on map
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {isDetailed
            ? "Click to view this prediction on the map"
            : "Click to view detailed weather information"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
