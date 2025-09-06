"use client";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { clearCache, clearAllMarkers } from "~/lib/map/mapSlice";
import { resetPrediction } from "~/lib/prediction/predictionSlice";
import { useDispatch } from "react-redux";
import { Trash2, Database, MapPin, Calendar } from "lucide-react";

interface CacheDebuggerProps {
  className?: string;
}

export default function CacheDebugger({ className }: CacheDebuggerProps) {
  const dispatch = useDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [predictionsCacheSize, setPredictionsCacheSize] = useState(0);
  const [localStorageSize, setLocalStorageSize] = useState(0);

  const { cachedLocations, predictions, markers, isCalculating } = useSelector(
    (state: {
      map: {
        cachedLocations: string[];
        predictions: Record<string, unknown>;
        markers: unknown[];
        isCalculating: boolean;
      };
    }) => state.map,
  );

  const mainPredictions = useSelector(
    (state: { prediction: { prediction: unknown[] } }) =>
      state.prediction.prediction,
  );

  // Check predictions tab cache from localStorage
  useEffect(() => {
    const checkPredictionsCache = () => {
      try {
        const cached = localStorage.getItem("sunset-app-predictions-cache");
        if (cached) {
          const parsedCache = JSON.parse(cached);
          setPredictionsCacheSize(Object.keys(parsedCache).length);
        } else {
          setPredictionsCacheSize(0);
        }

        // Calculate total localStorage usage
        let totalSize = 0;
        for (let key in localStorage) {
          if (key.startsWith("sunset-app-")) {
            totalSize += localStorage.getItem(key)?.length || 0;
          }
        }
        setLocalStorageSize(Math.round(totalSize / 1024)); // Convert to KB
      } catch (error) {
        setPredictionsCacheSize(0);
        setLocalStorageSize(0);
      }
    };

    checkPredictionsCache();
    const interval = setInterval(checkPredictionsCache, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const cacheStats = {
    cachedLocations: cachedLocations.length,
    totalPredictions: Object.keys(predictions).length,
    totalMarkers: markers.length,
    predictionsCacheSize,
    localStorageSize,
    cacheHitRate:
      markers.length > 0
        ? ((cachedLocations.length / markers.length) * 100).toFixed(1)
        : "0",
  };

  const handleClearMapCache = () => {
    dispatch(clearCache());
  };

  const handleClearPredictionsCache = () => {
    // Clear predictions tab cache from localStorage
    localStorage.removeItem("sunset-app-predictions-cache");
    // Reset predictions in Redux store
    dispatch(resetPrediction());
    setPredictionsCacheSize(0);
  };

  const handleClearMarkers = () => {
    dispatch(clearAllMarkers());
  };

  const handleClearAllCaches = () => {
    // Clear all sunset-app related localStorage
    const keysToRemove = [];
    for (let key in localStorage) {
      if (key.startsWith("sunset-app-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Clear Redux stores
    dispatch(clearCache());
    dispatch(clearAllMarkers());
    dispatch(resetPrediction());

    // Reset local state
    setPredictionsCacheSize(0);
    setLocalStorageSize(0);
  };

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Database className="mr-1 h-3 w-3" />
          Cache: M{cacheStats.totalMarkers} | P{cacheStats.predictionsCacheSize}{" "}
          | {cacheStats.localStorageSize}KB
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-96 border-2 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Cache Debugger
            <Button
              onClick={() => setIsExpanded(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Map Markers:</span>
              <div className="text-lg font-bold text-blue-600">
                {cacheStats.totalMarkers}
              </div>
            </div>
            <div>
              <span className="font-medium">Map Cache:</span>
              <div className="text-lg font-bold text-green-600">
                {cacheStats.cachedLocations}
              </div>
            </div>
            <div>
              <span className="font-medium">Predictions Cache:</span>
              <div className="text-lg font-bold text-purple-600">
                {cacheStats.predictionsCacheSize}
              </div>
            </div>
            <div>
              <span className="font-medium">Storage Used:</span>
              <div className="text-lg font-bold text-orange-600">
                {cacheStats.localStorageSize}KB
              </div>
            </div>
          </div>

          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  isCalculating
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {isCalculating ? "Loading..." : "Ready"}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleClearMarkers}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                disabled={cacheStats.totalMarkers === 0}
              >
                <MapPin className="h-3 w-3" />
                Clear Markers
              </Button>
              <Button
                onClick={handleClearMapCache}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                disabled={cacheStats.cachedLocations === 0}
              >
                <Database className="h-3 w-3" />
                Clear Map Cache
              </Button>
            </div>
            <Button
              onClick={handleClearPredictionsCache}
              variant="outline"
              size="sm"
              className="flex w-full items-center gap-1"
              disabled={cacheStats.predictionsCacheSize === 0}
            >
              <Calendar className="h-3 w-3" />
              Clear Predictions Cache
            </Button>
            <Button
              onClick={handleClearAllCaches}
              variant="destructive"
              size="sm"
              className="flex w-full items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear All Caches
            </Button>
          </div>

          {cachedLocations.length > 0 && (
            <div className="border-t pt-2">
              <div className="mb-1 font-medium">Cached Keys:</div>
              <div className="max-h-20 overflow-y-auto rounded bg-muted p-1 text-xs">
                {cachedLocations
                  .slice(0, 5)
                  .map((key: string, index: number) => (
                    <div key={index} className="truncate">
                      {key}
                    </div>
                  ))}
                {cachedLocations.length > 5 && (
                  <div className="text-muted-foreground">
                    ... and {cachedLocations.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
