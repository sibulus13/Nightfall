"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { CiSaveDown1 } from "react-icons/ci";
import { GrScorecard } from "react-icons/gr";
import { FcGlobe } from "react-icons/fc";
import { FcOldTimeCamera } from "react-icons/fc";
import { scrollIntoTheView } from "~/lib/document";
import Locator from "~/components/locator";
import usePrediction from "~/hooks/usePrediction";

export default function MainPage() {
  const Router = useRouter();
  const dispatch = useDispatch();
  const { predict } = usePrediction();

  function toAppPage() {
    Router.push("/App");
  }

  async function setPlace(place: google.maps.places.PlaceResult | null) {
    const lat = place?.geometry?.location?.lat();
    const lon = place?.geometry?.location?.lng();
    if (lat && lon) {
      // Set the location in the map slice so it's available when navigating to app page
      dispatch({ type: "map/setCurrentLocation", payload: { lat, lng: lon } });
      await predict({ lat, lon, onNavigate: toAppPage });
    }
  }

  async function setUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        // Set the location in the map slice so it's available when navigating to app page
        dispatch({
          type: "map/setCurrentLocation",
          payload: { lat, lng: lon },
        });
        predict({ lat, lon, onNavigate: toAppPage }).catch(console.error);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  return (
    <div className="page items-center gap-24">
      <div className="flex h-[calc(85vh)] w-screen flex-col bg-gradient-to-b from-transparent via-pink-300/80 to-transparent dark:via-pink-400/60 lg:w-[calc(100vw-10px)]">
        {/* Janky lg-w screen to full screen without scroll bar */}
        {/* Headline */}
        <div className="flex grow flex-col items-center justify-center">
          <h1 className="text-center text-4xl font-bold md:text-5xl">
            Find the Perfect
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent dark:from-pink-400 dark:to-purple-400">
              {" "}
              Sunset Times{" "}
            </span>
            & Golden Hour
          </h1>
          <p className="mt-4 max-w-2xl text-center text-lg text-foreground md:text-xl">
            Get accurate sunset predictions, golden hour timing, and weather
            forecasts to capture stunning sunset photos anywhere in the world.
          </p>
          <br></br>
          <Locator
            setSelectedPlace={setPlace}
            handleLocationClick={setUserLocation}
          />
        </div>
        <button
          onClick={() => scrollIntoTheView("features-section")}
          className="flex items-center justify-center text-foreground transition-colors hover:text-muted-foreground"
        >
          <CiSaveDown1 className="h-12 w-12" />
        </button>
      </div>
      {/* Features */}
      <div className="flex flex-col items-center pt-16" id="features-section">
        <h2 className="mb-8 text-center text-3xl font-bold">
          Why Choose Nightfalls for Sunset Planning?
        </h2>

        <div className="grid w-full max-w-6xl gap-8 px-4 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <GrScorecard className="mb-4 h-20 w-20 text-orange-500 dark:text-orange-400" />
            <h3 className="mb-3 text-xl font-semibold text-foreground">
              Accurate Sunset Scores
            </h3>
            <p className="leading-relaxed text-muted-foreground">
              Get precise sunset quality predictions with our advanced scoring
              system. Know exactly when the best sunset times are for any
              location, with detailed weather conditions and atmospheric quality
              assessments.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <FcGlobe className="mb-4 h-20 w-20" />
            <h3 className="mb-3 text-xl font-semibold text-foreground">
              Worldwide Coverage
            </h3>
            <p className="leading-relaxed text-muted-foreground">
              From the beaches of Hawaii to the mountains of Switzerland, our
              sunset predictions work globally. Find the best sunset viewing
              spots and golden hour times anywhere in the world.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <FcOldTimeCamera className="mb-4 h-20 w-20" />
            <h3 className="mb-3 text-xl font-semibold text-foreground">
              Photographer&apos;s Dream
            </h3>
            <p className="leading-relaxed text-muted-foreground">
              Perfect for photographers! Get golden hour timing, weather
              forecasts, and sunset quality scores to plan your shoots. Never
              miss the perfect lighting conditions for stunning sunset
              photography.
            </p>
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="flex flex-col items-center pb-8 pt-16">
        <div className="max-w-4xl px-4 text-center">
          <h2 className="mb-6 text-2xl font-bold text-foreground">
            The Perfect Sunset Awaits
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
            Whether you&apos;re a professional photographer seeking the perfect
            golden hour, a traveler wanting to experience breathtaking sunsets,
            or simply someone who loves to watch the sky paint itself in
            brilliant colors, Nightfalls is your ultimate sunset companion.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Our advanced algorithms analyze weather patterns, atmospheric
            conditions, and seasonal factors to give you the most accurate
            sunset predictions available. Plan your sunset viewing, photography
            sessions, or romantic evenings with confidence, knowing exactly when
            nature will put on its most spectacular show.
          </p>
        </div>
      </div>
      <br></br>
    </div>
  );
}
