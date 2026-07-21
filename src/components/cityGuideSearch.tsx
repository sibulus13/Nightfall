"use client";

import { useCallback, useState } from "react";
import { MapPin, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import CyclingLoader from "~/components/cyclingLoader";
import Locator from "~/components/locator";
import type { CityGuide, CityGuideFeedbackResponse } from "~/types/cityGuide";

const CITY_GUIDE_CLIENT_CACHE_PREFIX = "nightfalls-city-guide-v1";

// City-guide-flavoured phrases while the AI guide is generated.
const GUIDE_MESSAGES = [
  "Scouting the city",
  "Reading the light",
  "Picking the best spots",
  "Timing the phases",
  "Writing your guide",
];

export default function CityGuideSearch() {
  const [guide, setGuide] = useState<CityGuide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(
    null,
  );

  const loadGuide = useCallback(
    async (request: {
      cityName: string;
      latitude: number;
      longitude: number;
    }) => {
      setIsLoading(true);
      setError(null);
      setFeedbackRating(null);

      const cacheKey = getClientCacheKey(request);
      const cachedGuide = getCachedClientGuide(cacheKey);

      if (cachedGuide) {
        setGuide(cachedGuide);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/locations/city-guide", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error("Unable to load city guide");
        }

        const nextGuide = (await response.json()) as CityGuide;
        setGuide(nextGuide);
        setCachedClientGuide(cacheKey, nextGuide);
      } catch {
        setError("Could not build a city guide right now. Try the planner map instead.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handlePlaceSelect = useCallback(
    (place: google.maps.places.PlaceResult | null) => {
      const latitude = place?.geometry?.location?.lat();
      const longitude = place?.geometry?.location?.lng();

      if (!place || !latitude || !longitude) {
        setError("Choose a city from the search suggestions.");
        return;
      }

      void loadGuide({
        cityName:
          place.name ??
          place.formatted_address?.split(",")[0] ??
          "Selected city",
        latitude,
        longitude,
      });
    },
    [loadGuide],
  );

  const handleLocationClick = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadGuide({
          cityName: "near you",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setError("Could not read your location."),
      { maximumAge: 15 * 60 * 1000, timeout: 4000 },
    );
  }, [loadGuide]);

  async function submitFeedback(rating: "up" | "down") {
    if (!guide) {
      return;
    }

    setFeedbackRating(rating);

    try {
      const response = await fetch("/api/locations/city-guide/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ guideId: guide.id, rating }),
      });
      const feedbackResponse =
        (await response.json()) as CityGuideFeedbackResponse;

      if (!feedbackResponse.ok) {
        setFeedbackRating(null);
      }
    } catch {
      setFeedbackRating(null);
    }
  }

  return (
    <section
      id="city-guide-search"
      className="scroll-mt-20 border-y border-[#ded0c0] bg-[#fff7ef] dark:border-[#34302b] dark:bg-[#1d1b18]"
    >
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 lg:grid-cols-[370px_minmax(0,1fr)]">
        <div>
          <div className="nf-section-label">Live city guide</div>
          <h2 className="mt-2 text-2xl font-black">Search any city</h2>
          <p className="mt-2 text-sm leading-6 text-[#625850] dark:text-[#cfc4b9]">
            Build a city-specific sunset scouting guide with nearby spots,
            phase timing, and practical photo notes.
          </p>
          <div className="mt-4 rounded-md border border-[#d7c1ad] bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-white/10">
            <Locator
              setSelectedPlace={handlePlaceSelect}
              handleLocationClick={handleLocationClick}
            />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Guides cache locally and on the server to avoid repeated AI calls.
          </div>
        </div>

        <div className="min-h-56 rounded-md border border-[#d7c1ad] bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
          {isLoading && (
            <div className="flex h-full min-h-48 items-center justify-center">
              <CyclingLoader messages={GUIDE_MESSAGES} />
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              {error}
            </div>
          )}

          {!isLoading && !guide && !error && (
            <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-[#d9c8b6] text-sm text-muted-foreground dark:border-white/10">
              Pick a city to create a guide.
            </div>
          )}

          {!isLoading && guide && (
            <div>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f3ded1] px-2 py-0.5 text-[10px] font-bold uppercase text-[#753a27] dark:bg-white/10 dark:text-[#f4c3b1]">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {guide.source === "cache" ? "cached" : guide.source}
                  </div>
                  <h3 className="mt-2 pb-0 text-xl font-black">
                    {guide.cityName}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5e554d] dark:text-[#d1c5bb]">
                    {guide.summary}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => void submitFeedback("up")}
                    className={`nf-icon-button ${feedbackRating === "up" ? "bg-[#f3ded1] text-[#8b3d22]" : ""}`}
                    aria-label="This city guide was useful"
                    title="This guide was useful"
                  >
                    <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitFeedback("down")}
                    className={`nf-icon-button ${feedbackRating === "down" ? "bg-[#f3ded1] text-[#8b3d22]" : ""}`}
                    aria-label="This city guide needs work"
                    title="This guide needs work"
                  >
                    <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-2">
                  {guide.recommendedSpots.slice(0, 4).map((spot) => (
                    <article
                      key={spot.id}
                      className="rounded-md border border-[#ead8c8] bg-white/70 p-3 dark:border-white/10 dark:bg-black/10"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b84f35]" />
                        <div>
                          <div className="text-sm font-bold">{spot.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {spot.kind} · {spot.recommendedFor.join(", ")}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="space-y-3 text-sm">
                  <GuideList title="Best windows" items={guide.bestTimes} />
                  <GuideList title="Scouting notes" items={guide.scoutingTips} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function GuideList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 4).map((item) => (
          <li key={item} className="leading-5 text-[#5e554d] dark:text-[#d1c5bb]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getClientCacheKey(location: {
  cityName: string;
  latitude: number;
  longitude: number;
}): string {
  return [
    CITY_GUIDE_CLIENT_CACHE_PREFIX,
    location.cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    location.latitude.toFixed(2),
    location.longitude.toFixed(2),
  ].join(":");
}

function getCachedClientGuide(cacheKey: string): CityGuide | null {
  try {
    const rawGuide = localStorage.getItem(cacheKey);

    if (!rawGuide) {
      return null;
    }

    const guide = JSON.parse(rawGuide) as CityGuide;

    if (new Date(guide.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return {
      ...guide,
      source: "cache",
      cacheStatus: "hit",
    };
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
}

function setCachedClientGuide(cacheKey: string, guide: CityGuide): void {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(guide));
  } catch {
    // Best-effort cache only.
  }
}
