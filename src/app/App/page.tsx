"use client";
import { useEffect, useState } from "react";
import { type Prediction } from "~/lib/sunset/type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Hourglass } from "lucide-react";
import { BsSunset } from "react-icons/bs";
import { TbSunset2 } from "react-icons/tb";
import { MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import WeatherDisplay from "~/components/weatherDisplay";
import Locator from "~/components/locator";
import SunsetMap from "~/components/sunsetMap";
import { useSelector } from "react-redux";
import usePrediction from "~/hooks/usePrediction";
import { formatDate, formatTime } from "~/lib/time/helper";

const getScoreGradient = (score: number) => {
  const baseColors = ["from-orange-300 via-pink-400 to-purple-500"];
  const saturation = score; // Use score directly for saturation
  return { color: `${baseColors[0]}`, saturation: saturation };
};

const truncateScore = (score: number, lowerLimit = 0, upperLimit = 100) => {
  const range = upperLimit - lowerLimit;
  score = (score / 100) * range + lowerLimit;
  return score.toFixed(0);
};

export default function AppPage() {
  const { predict } = usePrediction();
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 });

  const prediction = useSelector(
    (state: { prediction: { prediction: Prediction[] } }) =>
      state.prediction.prediction,
  );

  async function setPlace(place: google.maps.places.PlaceResult | null) {
    const lat = place?.geometry?.location?.lat();
    const lon = place?.geometry?.location?.lng();
    if (!lat || !lon) {
      return;
    }
    setCurrentLocation({ lat, lng: lon });
    await predict({ lat, lon });
  }

  async function setUserLocation() {
    if (navigator.geolocation) {
      navigator?.geolocation?.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCurrentLocation({ lat, lng: lon });
        predict({ lat, lon }).catch(console.error);
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
        setCurrentLocation({ lat, lng: lon });
        predict({ lat, lon }).catch(console.error);
      }
    }
  });

  return (
    <TooltipProvider>
      <div className="page justify-center">
        <div className="flex justify-center p-2 py-4">
          <Locator
            setSelectedPlace={setPlace}
            handleLocationClick={setUserLocation}
          />
        </div>

        <Tabs defaultValue="map" className="mx-auto w-full max-w-6xl">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger
              value="predictions"
              className="flex items-center gap-2"
            >
              <TbSunset2 className="h-4 w-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            <div className="group grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {prediction.map((entry, i) => (
                <Card
                  key={i}
                  className={`bg-gradient-to-br ${getScoreGradient(entry.score).color} transition-all duration-300 ease-in-out hover:scale-105 hover:!opacity-100 group-hover:opacity-60`}
                  style={{
                    filter: `saturate(${getScoreGradient(entry.score).saturation}%)`,
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">
                      {formatDate(entry.sunset_time + "Z")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <WeatherDisplay weatherCode={entry.weather_code} />
                      <div className="flex items-center justify-center">
                        <TbSunset2 className="mb-2 h-12 w-12 text-yellow-300" />
                        <span className="text-4xl font-bold">
                          {truncateScore(entry.score) + "%"}
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
                              {formatTime(entry.sunset_time + "Z")}
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
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            {currentLocation.lat !== 0 && currentLocation.lng !== 0 ? (
              <SunsetMap initialLocation={currentLocation} />
            ) : (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">
                    Select a location to view map
                  </p>
                  <p className="text-sm">
                    Use the location selector above to see sunset predictions on
                    the map.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
