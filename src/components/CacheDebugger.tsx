"use client";
import { useSelector } from "react-redux";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { clearCache } from "~/lib/map/mapSlice";
import { useDispatch } from "react-redux";


interface CacheDebuggerProps {
  className?: string;
}

export default function CacheDebugger({ className }: CacheDebuggerProps) {
  const dispatch = useDispatch();
  const [isExpanded, setIsExpanded] = useState(false);

  const { cachedLocations, predictions, markers, isCalculating } = useSelector(
    (state: { map: { cachedLocations: string[]; predictions: Record<string, unknown>; markers: unknown[]; isCalculating: boolean } }) => state.map,
  );

  const cacheStats = {
    cachedLocations: cachedLocations.length,
    totalPredictions: Object.keys(predictions).length,
    totalMarkers: markers.length,
    cacheHitRate:
      markers.length > 0
        ? ((cachedLocations.length / markers.length) * 100).toFixed(1)
        : "0",
  };

  const handleClearCache = () => {
    dispatch(clearCache());
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
          Cache: {cacheStats.cachedLocations}/{cacheStats.totalMarkers} (
          {cacheStats.cacheHitRate}%)
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80 border-2 bg-background/95 backdrop-blur-sm">
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
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Cached Locations:</span>
              <div className="text-lg font-bold text-green-600">
                {cacheStats.cachedLocations}
              </div>
            </div>
            <div>
              <span className="font-medium">Total Markers:</span>
              <div className="text-lg font-bold text-blue-600">
                {cacheStats.totalMarkers}
              </div>
            </div>
            <div>
              <span className="font-medium">Cache Hit Rate:</span>
              <div className="text-lg font-bold text-purple-600">
                {cacheStats.cacheHitRate}%
              </div>
            </div>
            <div>
              <span className="font-medium">Predictions:</span>
              <div className="text-lg font-bold text-orange-600">
                {cacheStats.totalPredictions}
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

          <div className="border-t pt-2">
            <Button
              onClick={handleClearCache}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Clear Cache
            </Button>
          </div>

          {cachedLocations.length > 0 && (
            <div className="border-t pt-2">
              <div className="mb-1 font-medium">Cached Keys:</div>
              <div className="max-h-20 overflow-y-auto rounded bg-muted p-1 text-xs">
                {cachedLocations.slice(0, 5).map((key: string, index: number) => (
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
