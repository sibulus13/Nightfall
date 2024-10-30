"use client";
import React, { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useRouter } from "next/navigation";
import { PlaceAutocomplete } from "~/components/autoComplete";
import { CiSaveDown1 } from "react-icons/ci";
import Link from "next/link";
const API_KEY: string = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export default function MainPage() {
  const Router = useRouter();
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  useEffect(() => {
    if (selectedPlace) {
      const lat = selectedPlace?.geometry?.location?.lat();
      const lng = selectedPlace?.geometry?.location?.lng();
      Router.push("/App" + "?lat=" + lat + "&lng=" + lng);
    }
  }, [selectedPlace, Router]);

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex h-[calc(100vh-64px)] flex-col">
        {/* Headline */}
        <div className="-m-2 flex grow flex-col items-center justify-center bg-gradient-to-b from-transparent via-pink-300 to-transparent">
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
            <div className="autocomplete-control">
              <PlaceAutocomplete onPlaceSelect={setSelectedPlace} />
            </div>
          </APIProvider>
        </div>
        <div className="flex justify-center">
          <Link
            href="#features-section"
            className="flex items-center justify-center rounded-full p-4"
          >
            <CiSaveDown1 className="h-12 w-12" />
          </Link>
        </div>
      </div>
      {/* Features */}
      <div className="flex flex-col items-center">
        <br id="features-section"></br>
        <h2 className="mb-2 border-b p-1">Sunset Score</h2>
        Nightfall provides location-based weekly sunset quality forecasts.
        Providing a holisttic score to easily visualize the quality of the
        sunset for the week in a single glance.
      </div>
      <div className="flex flex-col items-center">
        <h2 className="mb-2 border-b p-1">Global Predictions</h2>
        From Vancouver, Canada, to Sydney, Australia, Nightfall provides sunset
        quality forecasts for locations around the world.
      </div>
      <div className="flex flex-col items-center">
        <h2 className="mb-2 border-b p-1">For Photographers</h2>
        Lighting is a key factor in photography. Nightfall provides the golden
        hour duration as well as weather conditions to help photographers plan
        their shoots. So you can capture the perfect moment without worrying
        about getting wet.
      </div>
      <br className="pt-20"></br>
    </div>
  );
}
