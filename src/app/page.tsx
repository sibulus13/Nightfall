"use client";
import React, { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useRouter } from "next/navigation";
import { PlaceAutocomplete } from "~/components/autoComplete";
import { CiSaveDown1 } from "react-icons/ci";
import { GrScorecard } from "react-icons/gr";
import { FcGlobe } from "react-icons/fc";
import { FcOldTimeCamera } from "react-icons/fc";
import { scrollIntoTheView } from "~/lib/document";
import { FaLocationCrosshairs } from "react-icons/fa6";
const API_KEY: string = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export default function MainPage() {
  function handleLocationClick() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }
  const Router = useRouter();
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    if (selectedPlace || (lat && lng)) {
      const latitude = lat ?? selectedPlace?.geometry?.location?.lat();
      const longitude = lng ?? selectedPlace?.geometry?.location?.lng();
      Router.push("/App" + "?lat=" + latitude + "&lng=" + longitude);
    }
  }, [selectedPlace, Router, lat, lng]);

  return (
    <div className="page items-center gap-24">
      <div className="flex h-[calc(85vh)] w-screen flex-col bg-gradient-to-b from-transparent via-pink-300 to-transparent">
        {/* Headline */}
        <div className="flex grow flex-col items-center justify-center px-4">
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
          <APIProvider apiKey={API_KEY}>
            <div className="flex gap-2">
              <PlaceAutocomplete onPlaceSelect={setSelectedPlace} />
              <button onClick={handleLocationClick}>
                <FaLocationCrosshairs className="h-10 w-10" />
              </button>
            </div>
          </APIProvider>
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
