import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { type Prediction } from "~/lib/sunset/type";
import {
  Hourglass,
  Eye,
  Cloud,
  Droplets,
  Gauge,
  ArrowLeft,
} from "lucide-react";
import { BsSunset } from "react-icons/bs";
import { TbSunset2 } from "react-icons/tb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import WeatherDisplay from "~/components/weatherDisplay";
import { formatDate, formatTime } from "~/lib/time/helper";

interface ExpandablePredictionCardProps {
  prediction: Prediction;
  onMapClick: () => void;
  getScoreGradient: (score: number) => { color: string; saturation: number };
  truncateScore: (score: number) => string;
}

export default function ExpandablePredictionCard({
  prediction,
  onMapClick,
  getScoreGradient,
  truncateScore,
}: ExpandablePredictionCardProps) {
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

  const getQualityColor = (value: number, thresholds: number[]) => {
    if (thresholds.length >= 3 && value <= (thresholds[0] ?? 0))
      return "text-green-600";
    if (thresholds.length >= 3 && value <= (thresholds[1] ?? 0))
      return "text-blue-600";
    if (thresholds.length >= 3 && value <= (thresholds[2] ?? 0))
      return "text-yellow-600";
    return "text-orange-600";
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
          <CardContent className="flex min-h-[200px] flex-col justify-between">
            {/* Basic View */}
            <div
              className={`flex flex-col justify-between transition-all duration-500 ease-in-out ${
                isDetailed ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              {/* Basic Info */}
              <div className="flex items-center justify-between">
                <WeatherDisplay weatherCode={prediction.weather_code} />
                <div className="flex items-center justify-center">
                  <TbSunset2 className="mb-2 h-12 w-12 text-yellow-300" />
                  <span className="text-4xl font-bold">
                    {truncateScore(prediction.score) + "%"}
                  </span>
                </div>
              </div>

              {/* Time Info */}
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

              {/* Compact Weather Info */}
              <div className="grid grid-cols-5 gap-2 text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-white/90" />
                      <span
                        className={getQualityColor(
                          prediction.visibility,
                          [10000, 20000, 5000],
                        )}
                      >
                        {formatVisibility(prediction.visibility)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visibility</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-white/90" />
                      <span
                        className={getQualityColor(
                          prediction.humidity,
                          [40, 60, 80],
                        )}
                      >
                        {prediction.humidity.toFixed(0)}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Humidity</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-white/90" />
                      <span className="text-white/80">
                        {formatPressure(prediction.surface_pressure)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Air Pressure</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Cloud className="h-3 w-3 text-white/90" />
                      <span
                        className={getQualityColor(
                          prediction.cloud_cover,
                          [20, 40, 60],
                        )}
                      >
                        {prediction.cloud_cover.toFixed(0)}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total Cloud Coverage</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Cloud className="h-3 w-3 text-white/40" />
                      <span className="text-white/80">
                        {prediction.pm2_5?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>PM2.5 (μg/m³)</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Cloud Coverage - Compact */}
              <div className="space-y-1">
                <div className="text-center text-xs font-medium text-white/90">
                  Cloud Coverage
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center">
                        <div className="text-white/80">Low</div>
                        <div
                          className={getQualityColor(
                            prediction.cloud_cover_low,
                            [20, 40, 60],
                          )}
                        >
                          {prediction.cloud_cover_low.toFixed(0)}%
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Low Cloud Coverage (0-2km)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center">
                        <div className="text-white/80">Mid</div>
                        <div
                          className={getQualityColor(
                            prediction.cloud_cover_mid,
                            [20, 40, 60],
                          )}
                        >
                          {prediction.cloud_cover_mid.toFixed(0)}%
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Medium Cloud Coverage (2-6km)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center">
                        <div className="text-white/80">High</div>
                        <div
                          className={getQualityColor(
                            prediction.cloud_cover_high,
                            [20, 40, 60],
                          )}
                        >
                          {prediction.cloud_cover_high.toFixed(0)}%
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>High Cloud Coverage (6-12km)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Score Breakdown - Compact */}
              <div className="grid grid-cols-6 gap-2 text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <div className="text-white/80">Cloud</div>
                      <div className="text-sm font-bold">
                        {prediction.scores.cloudCoverage}%
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cloud Coverage Score</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <div className="text-white/80">Vis</div>
                      <div className="text-sm font-bold">
                        {prediction.scores.visibility}%
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visibility Score</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <div className="text-white/80">Hum</div>
                      <div className="text-sm font-bold">
                        {prediction.scores.humidity}%
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Humidity Score</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <div className="text-white/80">Pres</div>
                      <div className="text-sm font-bold">
                        {prediction.scores.pressure}%
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pressure Score</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <div className="text-white/80">Part</div>
                      <div className="text-sm font-bold">
                        {prediction.scores.particulate}%
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Particulate Score</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <div className="text-white/80">Overall</div>
                      <div className="text-sm font-bold">
                        {prediction.scores.score}%
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Overall Score</p>
                  </TooltipContent>
                </Tooltip>
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
