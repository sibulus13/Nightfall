import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { type Prediction } from "~/lib/sunset/type";
import {
  Eye,
  Cloud,
  Droplets,
  Gauge,
  CloudRain,
  CloudLightning,
} from "lucide-react";

interface SunsetDetailsProps {
  prediction: Prediction;
}

export default function SunsetDetails({ prediction }: SunsetDetailsProps) {
  const formatVisibility = (visibility: number) => {
    if (visibility >= 1000) {
      return `${(visibility / 1000).toFixed(1)} km`;
    }
    return `${visibility.toFixed(0)} m`;
  };

  const formatPressure = (pressure: number) => {
    return `${pressure.toFixed(0)} hPa`;
  };

  const getCloudCoverageQuality = (coverage: number) => {
    if (coverage <= 20)
      return { quality: "Excellent", color: "text-green-600" };
    if (coverage <= 40) return { quality: "Good", color: "text-blue-600" };
    if (coverage <= 60) return { quality: "Fair", color: "text-yellow-600" };
    if (coverage <= 80) return { quality: "Poor", color: "text-orange-600" };
    return { quality: "Very Poor", color: "text-red-600" };
  };

  const getVisibilityQuality = (visibility: number) => {
    if (visibility >= 20000)
      return { quality: "Excellent", color: "text-green-600" };
    if (visibility >= 10000) return { quality: "Good", color: "text-blue-600" };
    if (visibility >= 5000)
      return { quality: "Fair", color: "text-yellow-600" };
    if (visibility >= 1000)
      return { quality: "Poor", color: "text-orange-600" };
    return { quality: "Very Poor", color: "text-red-600" };
  };

  const getHumidityQuality = (humidity: number) => {
    if (humidity <= 40)
      return { quality: "Excellent", color: "text-green-600" };
    if (humidity <= 60) return { quality: "Good", color: "text-blue-600" };
    if (humidity <= 80) return { quality: "Fair", color: "text-yellow-600" };
    return { quality: "Poor", color: "text-orange-600" };
  };

  const visibilityQuality = getVisibilityQuality(prediction.visibility);
  const humidityQuality = getHumidityQuality(prediction.humidity);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Visibility & Atmospheric Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visibility */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Visibility</p>
                <p className="text-sm text-muted-foreground">
                  {formatVisibility(prediction.visibility)}
                </p>
              </div>
            </div>
            <span className={`font-semibold ${visibilityQuality.color}`}>
              {visibilityQuality.quality}
            </span>
          </div>

          {/* Air Pressure */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Air Pressure</p>
                <p className="text-sm text-muted-foreground">
                  {formatPressure(prediction.surface_pressure)}
                </p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              {prediction.surface_pressure > 1013.25 ? "High" : "Low"}
            </span>
          </div>

          {/* Humidity */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="font-medium">Humidity</p>
                <p className="text-sm text-muted-foreground">
                  {prediction.humidity.toFixed(0)}%
                </p>
              </div>
            </div>
            <span className={`font-semibold ${humidityQuality.color}`}>
              {humidityQuality.quality}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5" />
            Cloud Coverage by Height
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Cloud Coverage */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">Total Cloud Coverage</p>
                <p className="text-sm text-muted-foreground">
                  {prediction.cloud_cover.toFixed(0)}%
                </p>
              </div>
            </div>
            <span
              className={`font-semibold ${getCloudCoverageQuality(prediction.cloud_cover).color}`}
            >
              {getCloudCoverageQuality(prediction.cloud_cover).quality}
            </span>
          </div>

          {/* Low Clouds */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <CloudRain className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium">Low Clouds</p>
                <p className="text-sm text-muted-foreground">
                  {prediction.cloud_cover_low.toFixed(0)}% (0-2km)
                </p>
              </div>
            </div>
            <span
              className={`font-semibold ${getCloudCoverageQuality(prediction.cloud_cover_low).color}`}
            >
              {getCloudCoverageQuality(prediction.cloud_cover_low).quality}
            </span>
          </div>

          {/* Medium Clouds */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">Medium Clouds</p>
                <p className="text-sm text-muted-foreground">
                  {prediction.cloud_cover_mid.toFixed(0)}% (2-6km)
                </p>
              </div>
            </div>
            <span
              className={`font-semibold ${getCloudCoverageQuality(prediction.cloud_cover_mid).color}`}
            >
              {getCloudCoverageQuality(prediction.cloud_cover_mid).quality}
            </span>
          </div>

          {/* High Clouds */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <CloudLightning className="h-5 w-5 text-white" />
              <div>
                <p className="font-medium">High Clouds</p>
                <p className="text-sm text-muted-foreground">
                  {prediction.cloud_cover_high.toFixed(0)}% (6-12km)
                </p>
              </div>
            </div>
            <span
              className={`font-semibold ${getCloudCoverageQuality(prediction.cloud_cover_high).color}`}
            >
              {getCloudCoverageQuality(prediction.cloud_cover_high).quality}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5" />
            Sunset Quality Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Cloud Coverage
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {prediction.scores.cloudCoverage}%
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Visibility
              </p>
              <p className="text-2xl font-bold text-green-600">
                {prediction.scores.visibility}%
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Humidity
              </p>
              <p className="text-2xl font-bold text-cyan-600">
                {prediction.scores.humidity}%
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Overall Score
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {prediction.scores.score}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
