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
  Wind,
  Thermometer,
  Zap,
  Sun,
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

              {/* Compact Score Breakdown */}
              <div className="space-y-1">
                <div className="mb-1 text-center text-xs font-medium text-white/90">
                  Factor Scores
                </div>

                {/* Primary Factors - 2 columns */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Cloud</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {prediction.cloud_cover.toFixed(0)}%
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.cloudCoverage}%
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cloud Coverage Score</p>
                      <p className="text-xs text-gray-300">
                        Based on total cloud cover (%)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Visibility</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {formatVisibility(prediction.visibility)}
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.visibility}%
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {prediction.humidity.toFixed(0)}%
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.humidity}%
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {formatPressure(prediction.surface_pressure)}
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.pressure}%
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {prediction.pm2_5?.toFixed(1) || "N/A"} μg/m³
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.particulate}%
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {prediction.wind_speed_10m?.toFixed(1) || "N/A"}{" "}
                            km/h
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.wind}%
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {prediction.temperature_2m?.toFixed(1) || "N/A"}°C
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.temperature}%
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

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">Stability</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {prediction.cape?.toFixed(0) || "N/A"} J/kg
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.stability}%
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Stability Score</p>
                      <p className="text-xs text-gray-300">
                        Based on CAPE & CIN (J/kg)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">UV Index</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">
                            {prediction.uv_index?.toFixed(1) || "N/A"}
                          </span>
                          <span className="font-bold text-white">
                            {prediction.scores.uv}%
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>UV Index Score</p>
                      <p className="text-xs text-gray-300">
                        Based on UV index (0-11+)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* TODO correct these calcuations */}
                  {/* <Tooltip>
                     <TooltipTrigger asChild>
                       <div className="flex items-center justify-between">
                         <span className="text-white/80">AOD</span>
                         <div className="flex items-center gap-2">
                           <span className="text-white/70 text-xs">
                             {prediction.aerosol_optical_depth?.toFixed(2) || "N/A"}
                           </span>
                           <span className="text-white font-bold">
                             {prediction.scores.aerosolOpticalDepth}%
                           </span>
                         </div>
                       </div>
                     </TooltipTrigger>
                     <TooltipContent>
                       <p>Aerosol Optical Depth Score</p>
                       <p className="text-xs text-gray-300">
                         Based on AOD (0-1+)
                       </p>
                     </TooltipContent> */}
                  {/* </Tooltip> */}

                  {/* <Tooltip>
                     <TooltipTrigger asChild>
                       <div className="flex items-center justify-between">
                         <span className="text-white/80">AQI</span>
                         <div className="flex items-center gap-2">
                           <span className="text-white/70 text-xs">
                             {prediction.european_aqi?.toFixed(0) || "N/A"}
                           </span>
                           <span className="text-white font-bold">
                             {prediction.scores.europeanAQI}%
                           </span>
                         </div>
                       </div>
                     </TooltipTrigger>
                     <TooltipContent>
                       <p>European Air Quality Index Score</p>
                       <p className="text-xs text-gray-300">
                         Based on European AQI (0-100+)
                       </p>
                     </TooltipContent>
                   </Tooltip> */}

                  {/* <Tooltip>
                     <TooltipTrigger asChild>
                       <div className="flex items-center justify-between">
                         <span className="text-white/80">O₃</span>
                         <div className="flex items-center gap-2">
                           <span className="text-white/70 text-xs">
                             {prediction.ozone?.toFixed(0) || "N/A"} μg/m³
                           </span>
                           <span className="text-white font-bold">
                             {prediction.scores.ozone}%
                           </span>
                         </div>
                       </div>
                     </TooltipTrigger>
                     <TooltipContent>
                       <p>Ozone Score</p>
                       <p className="text-xs text-gray-300">
                         Based on ozone (μg/m³)
                       </p>
                     </TooltipContent>
                   </Tooltip> */}

                  {/* <Tooltip>
                     <TooltipTrigger asChild>
                       <div className="flex items-center justify-between">
                         <span className="text-white/80">NO₂</span>
                         <div className="flex items-center gap-2">
                           <span className="text-white/70 text-xs">
                             {prediction.nitrogen_dioxide?.toFixed(0) || "N/A"} μg/m³
                           </span>
                           <span className="text-white font-bold">
                             {prediction.scores.nitrogenDioxide}%
                           </span>
                         </div>
                       </div>
                     </TooltipTrigger>
                     <TooltipContent>
                       <p>Nitrogen Dioxide Score</p>
                       <p className="text-xs text-gray-300">
                         Based on NO₂ (μg/m³)
                       </p>
                     </TooltipContent>
                   </Tooltip> */}
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
