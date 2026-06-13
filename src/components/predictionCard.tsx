import { useState } from "react";
import { ArrowLeft, Cloud, Eye, Gauge, Hourglass, MapPin } from "lucide-react";
import { TbSunset2 } from "react-icons/tb";
import { BsSunset } from "react-icons/bs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import WeatherDisplay from "~/components/weatherDisplay";
import { formatDate, formatTime } from "~/lib/time/helper";
import { type Prediction } from "~/lib/sunset/type";

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
  const scoreGradient = getScoreGradient(prediction.score);
  const summary = getPredictionSummary(prediction.score);

  function handleClick() {
    if (isDetailed) {
      onMapClick();
      return;
    }

    setIsDetailed(true);
  }

  function handleBackClick(event: React.MouseEvent) {
    event.stopPropagation();
    setIsDetailed(false);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <article
          className={`nf-card relative min-h-[310px] cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group-hover:opacity-70 hover:!opacity-100 ${
            isDetailed ? "ring-2 ring-[#a6532d]" : ""
          }`}
          onClick={handleClick}
        >
          <div
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${scoreGradient.color}`}
            style={{ filter: `saturate(${scoreGradient.saturation}%)` }}
          />

          <div className="border-b border-[#eee0d0] px-4 pb-3 pt-5 dark:border-[#38322d]">
            <div className="text-sm font-black">
              {formatDate(prediction.sunset_time)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{summary}</div>
          </div>

          {!isDetailed ? (
            <div className="flex min-h-[250px] flex-col justify-between p-4">
              <div className="flex items-center justify-between gap-4">
                <WeatherDisplay weatherCode={prediction.weather_code} />
                <div className="flex min-w-32 flex-col items-center rounded-md bg-[#f5eee5] px-4 py-5 dark:bg-white/10">
                  <TbSunset2 className="mb-3 h-12 w-12 text-[#a6532d] dark:text-[#f0a36d]" />
                  <span className="text-4xl font-black">
                    {truncateScore(prediction.score)}%
                  </span>
                  <ScoreRangeBar
                    score={prediction.score}
                    confidence={prediction.scores.confidence}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-5 text-sm">
                <TimeMetric
                  icon={<Hourglass className="h-4 w-4" />}
                  label="Golden hour"
                  value={formatTime(prediction.golden_hour.start)}
                />
                <TimeMetric
                  icon={<BsSunset className="h-4 w-4" />}
                  label="Sunset"
                  value={formatTime(prediction.sunset_time)}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[250px] flex-col justify-between p-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleBackClick}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
              </div>

              <div>
                <div className="mb-3 text-xs font-bold uppercase text-muted-foreground">
                  Forecast signals
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <SignalMetric
                    icon={<Cloud className="h-3.5 w-3.5" />}
                    label="Cloud score"
                    value={`${prediction.scores.cloudCoverage}%`}
                    detail={`${prediction.cloud_cover.toFixed(0)}% cover`}
                  />
                  <SignalMetric
                    icon={<Eye className="h-3.5 w-3.5" />}
                    label="Visibility"
                    value={`${prediction.scores.visibility}%`}
                    detail={formatVisibility(prediction.visibility)}
                  />
                  <SignalMetric
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    label="Pressure"
                    value={`${prediction.scores.pressure}%`}
                    detail={`${prediction.surface_pressure.toFixed(0)} hPa`}
                  />
                  <SignalMetric
                    icon={<TbSunset2 className="h-3.5 w-3.5" />}
                    label="Confidence"
                    value={`+/-${prediction.scores.confidence}`}
                    detail="score range"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Click again to view on map
              </div>
            </div>
          )}
        </article>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {isDetailed
            ? "Click to view this prediction on the map"
            : "Click to inspect the forecast signals"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function TimeMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-[#f5eee5] p-3 dark:bg-white/10">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#8b3d22] dark:text-[#f0a36d]">
        {icon}
        {label}
      </div>
      <div className="font-black">{value}</div>
    </div>
  );
}

function SignalMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md bg-[#f5eee5] p-3 dark:bg-white/10">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-black">{value}</div>
      <div className="text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function ScoreRangeBar({
  score,
  confidence,
}: {
  score: number;
  confidence: number;
}) {
  const low = Math.max(0, score - confidence);
  const high = Math.min(100, score + confidence);

  return (
    <div className="mt-2 w-28">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div
          className="absolute h-full bg-[#a6532d]/40 dark:bg-white/50"
          style={{ left: `${low}%`, width: `${high - low}%` }}
        />
        <div
          className="absolute h-full w-0.5 bg-[#253f3d] dark:bg-white"
          style={{ left: `${score}%` }}
        />
      </div>
      <div className="mt-0.5 text-center text-[10px] text-muted-foreground">
        +/-{confidence}
      </div>
    </div>
  );
}

function formatVisibility(visibility: number): string {
  if (visibility >= 1000) {
    return `${(visibility / 1000).toFixed(1)} km`;
  }

  return `${visibility.toFixed(0)} m`;
}

function getPredictionSummary(score: number): string {
  if (score >= 78) {
    return "Strong chase candidate";
  }

  if (score >= 60) {
    return "Worth scouting";
  }

  if (score >= 42) {
    return "Conditional light";
  }

  return "Low-confidence sunset";
}
