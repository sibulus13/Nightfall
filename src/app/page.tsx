"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  Camera,
  Clock,
  Compass,
  MapPin,
  Mountain,
  Search,
  Sparkles,
  Waves,
} from "lucide-react";
import Locator from "~/components/locator";
import SunsetAtmosphere from "~/components/sunsetAtmosphere";
import usePrediction from "~/hooks/usePrediction";
import { getRankedSunsetRegions } from "~/lib/regions/sunsetRegions";

const planningSignals = [
  {
    label: "Forecast the sky",
    description:
      "Compare cloud layers, visibility, humidity, air quality, and sunset timing before committing to a spot.",
    icon: Sparkles,
  },
  {
    label: "Scout the place",
    description:
      "Find water, elevation, western exposure, open horizons, and foreground cues near your selected area.",
    icon: Compass,
  },
  {
    label: "Match the phase",
    description:
      "Bias recommendations toward golden hour, sun disk, Belt of Venus, civil twilight, or blue hour.",
    icon: Clock,
  },
];

const phaseCards = [
  {
    label: "Golden hour",
    detail: "Warm side light, portraits, foreground texture",
  },
  {
    label: "Sun disk",
    detail: "Clean western horizon, beaches, ridgelines",
  },
  {
    label: "Belt of Venus",
    detail: "Pink-purple antisolar sky after sunset",
  },
  {
    label: "Blue hour",
    detail: "Water reflections, skyline lights, calmer contrast",
  },
];

export default function MainPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { predict } = usePrediction();
  const regions = getRankedSunsetRegions();

  function toAppPage() {
    router.push("/App");
  }

  async function setPlace(place: google.maps.places.PlaceResult | null) {
    const lat = place?.geometry?.location?.lat();
    const lon = place?.geometry?.location?.lng();

    if (!lat || !lon) {
      return;
    }

    // Carry the name the user just picked so the planner's search bar reflects
    // it immediately, instead of re-deriving it via a reverse-geocode call.
    const name =
      place?.name ?? place?.formatted_address?.split(",")[0] ?? undefined;

    dispatch({
      type: "map/setCurrentLocation",
      payload: { lat, lng: lon, name },
    });
    await predict({ lat, lon, onNavigate: toAppPage });
  }

  async function setUserLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      dispatch({
        type: "map/setCurrentLocation",
        payload: { lat, lng: lon },
      });
      predict({ lat, lon, onNavigate: toAppPage }).catch(console.error);
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#191714] dark:bg-[#151515] dark:text-[#f7f1e7]">
      <section className="relative overflow-hidden border-b border-[#dccab8] dark:border-[#34302b]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(232,148,88,0.24),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(69,105,98,0.20),transparent_30%),linear-gradient(135deg,#f4f1ea_0%,#f9e3c9_52%,#d2ddd8_100%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(232,148,88,0.18),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(93,151,142,0.18),transparent_30%),linear-gradient(135deg,#151515_0%,#241d18_52%,#172421_100%)]" />
        <SunsetAtmosphere />
        <div className="relative mx-auto grid min-h-[calc(100vh-155px)] max-w-6xl content-center gap-10 px-4 py-12 md:grid-cols-[minmax(0,1fr)_390px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b89f86] bg-white/60 px-3 py-1 text-xs font-bold uppercase text-[#4d3a2d] backdrop-blur dark:border-[#51483f] dark:bg-white/10 dark:text-[#f1d7bf]">
              <Camera className="h-3.5 w-3.5" />
              Sunset photography field guide
            </div>
            <h1 className="text-5xl font-black leading-[0.95] tracking-normal md:text-7xl">
              Plan the shot before the sky changes.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#514a42] dark:text-[#d8cfc2]">
              Nightfalls combines sunset quality forecasts, golden hour timing,
              blue hour guidance, and nearby viewpoint recommendations so you
              can decide where to go and what phase to shoot.
            </p>
            <div className="mt-7 max-w-2xl rounded-md border border-[#cdb59c] bg-white/75 p-3 shadow-sm backdrop-blur dark:border-[#4a4037] dark:bg-black/20">
              <Locator
                setSelectedPlace={setPlace}
                handleLocationClick={setUserLocation}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/App"
                className="inline-flex items-center gap-2 rounded-md bg-[#181411] px-4 py-2 text-sm font-semibold text-white hover:bg-[#34281f] dark:bg-[#f4d2ad] dark:text-[#191714]"
              >
                <MapPin className="h-4 w-4" />
                Open planner
              </Link>
              <Link
                href="/locations/vancouver-bc#city-guide-search"
                className="inline-flex items-center gap-2 rounded-md border border-[#b89f86] bg-white/40 px-4 py-2 text-sm font-semibold text-[#2b241f] hover:bg-white/70 dark:border-[#5c5045] dark:bg-white/5 dark:text-[#f5e8dc] dark:hover:bg-white/10"
              >
                <Search className="h-4 w-4" />
                Browse sunset guides
              </Link>
            </div>
          </div>

          <aside className="self-center rounded-md border border-[#bba58d] bg-[#fffaf2]/85 p-4 shadow-xl backdrop-blur dark:border-[#453d36] dark:bg-[#1d1b18]/85">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-[#8b3d22] dark:text-[#f0a36d]">
                  Tonight&apos;s scouting model
                </div>
                <h2 className="pb-0 text-xl font-black">Multi-phase sunset fit</h2>
              </div>
              <Compass className="h-6 w-6 text-[#253f3d] dark:text-[#9ad0c8]" />
            </div>
            <div className="mt-4 space-y-2">
              {phaseCards.map((phase) => (
                <div
                  key={phase.label}
                  className="rounded-md border border-[#e1d1bf] bg-white/70 p-3 dark:border-[#37312c] dark:bg-white/10"
                >
                  <div className="text-sm font-bold">{phase.label}</div>
                  <div className="mt-1 text-xs leading-5 text-[#665d54] dark:text-[#c9beb3]">
                    {phase.detail}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        {planningSignals.map((signal) => {
          const Icon = signal.icon;

          return (
            <article
              key={signal.label}
              className="rounded-md border border-[#dccab8] bg-white p-5 shadow-sm dark:border-[#3d3731] dark:bg-[#211f1c]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[#253f3d] text-white dark:bg-[#6aa29b] dark:text-[#101615]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="pb-1 text-xl font-black">{signal.label}</h2>
              <p className="text-sm leading-6 text-[#61584f] dark:text-[#cfc4b9]">
                {signal.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="border-y border-[#ded0c0] bg-[#fffaf2] dark:border-[#34302b] dark:bg-[#1d1b18]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-6 max-w-2xl">
            <div className="text-xs font-bold uppercase text-[#8b3d22] dark:text-[#f0a36d]">
              Crawlable local guides
            </div>
            <h2 className="mt-2 text-3xl font-black">
              Start with the places most likely to pay off.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#61584f] dark:text-[#cfc4b9]">
              These guides are static, indexable starting points. The app still
              handles live map scouting, saved pins, and forecast comparison.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {regions.map((region) => {
              const topSpot = region.spots[0];

              return (
                <Link
                  key={region.slug}
                  href={`/locations/${region.slug}`}
                  className="rounded-md border border-[#d6c3af] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-[#3d3731] dark:bg-[#211f1c]"
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#8b3d22] dark:text-[#f0a36d]">
                    {region.slug === "vancouver-bc" ? (
                      <Waves className="h-3.5 w-3.5" />
                    ) : region.slug === "coquitlam-bc" ? (
                      <Mountain className="h-3.5 w-3.5" />
                    ) : (
                      <Compass className="h-3.5 w-3.5" />
                    )}
                    {region.areaLabel}
                  </div>
                  <h3 className="mt-3 pb-0 text-lg font-black">
                    {topSpot?.name ?? region.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#635a51] dark:text-[#cfc4b9]">
                    {region.topPhases.slice(0, 3).join(", ") ||
                      region.bestFor.slice(0, 3).join(", ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {region.topSceneQualities.slice(0, 3).map((quality) => (
                      <span
                        key={quality}
                        className="rounded-full bg-[#efe1d1] px-2 py-0.5 text-[10px] font-semibold text-[#4b392c] dark:bg-white/10 dark:text-[#f1ddc8]"
                      >
                        {quality}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
