"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { CiSaveDown1 } from "react-icons/ci";
import { GrScorecard } from "react-icons/gr";
import { FcGlobe } from "react-icons/fc";
import { FcOldTimeCamera } from "react-icons/fc";
import { scrollIntoTheView } from "~/lib/document";
import Locator from "~/components/locator";
import usePrediction from "~/hooks/usePrediction";

export default function MainPage() {
  const Router = useRouter();
  const { predict } = usePrediction();

  function toAppPage() {
    Router.push("/App");
  }

  async function setPlace(place: google.maps.places.PlaceResult | null) {
    const lat = place?.geometry?.location?.lat();
    const lon = place?.geometry?.location?.lng();
    if (lat && lon) {
      await predict({ lat, lon, onNavigate: toAppPage });
    }
  }

  async function setUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        predict({ lat, lon, onNavigate: toAppPage }).catch(console.error);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  return (
    <div className="page items-center gap-24">
      <div className="flex h-[calc(85vh)] flex-col bg-gradient-to-b from-transparent via-pink-300 to-transparent w-screen lg:w-[calc(100vw-17px)]"> 
        {/* Janky lg-w screen to full screen without scroll bar */}
        {/* Headline */}
        <div className="flex grow flex-col items-center justify-center">
          <h1 className="text-3xl">
            Weekly
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              {" "}
              Sunset{" "}
            </span>
            Quality Forecasts
          </h1>
          <p>Never miss another perfect sunset near you.</p>
          <br></br>
          <Locator
            setSelectedPlace={setPlace}
            handleLocationClick={setUserLocation}
          />
        </div>
        <button
          onClick={() => scrollIntoTheView("features-section")}
          className="flex items-center justify-center"
        >
          <CiSaveDown1 className="h-12 w-12" />
        </button>
      </div>
      {/* Features */}
      <div className="flex flex-col items-center pt-10" id="features-section">
        <GrScorecard className="h-24 w-24" />
        <h2 className="mb-2 border-b p-1 pt-4">Sunset Score</h2>
        Nightfall provides location-based weekly sunset quality forecasts.
        Providing a holisttic score to easily visualize the quality of the
        sunset for the week in a single glance.
      </div>
      <div className="flex flex-col items-center">
        <FcGlobe className="h-24 w-24" />
        <h2 className="mb-2 border-b p-1 pt-4">Global Predictions</h2>
        From Vancouver, Canada, to Sydney, Australia, Nightfall provides sunset
        quality forecasts for locations around the world.
      </div>
      <div className="flex flex-col items-center">
        <FcOldTimeCamera className="h-24 w-24" />
        <h2 className="mb-2 border-b p-1">For Photographers</h2>
        Lighting is a key factor in photography. Nightfall provides information
        on each day&apos;s golden hour as well as weather condition to help
        photographers plan their shoots, so you can always find the perfect
        condition to capture the perfect moment!
      </div>
      <br></br>
    </div>
  );
}
