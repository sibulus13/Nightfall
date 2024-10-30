"use client";
import React, { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useRouter } from "next/navigation";
import { PlaceAutocomplete } from "~/components/autoComplete";
const API_KEY: string = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
console.log(API_KEY);

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
      {/* Headline */}
      <h1 className="text-3xl">
        Weekly
        <span className="">Sunset</span>
        Quality Forecasts
      </h1>
      <p>Never miss another perfect sunset near you.</p>
      <br></br>
      <APIProvider apiKey={API_KEY}>
        <div className="autocomplete-control">
          <PlaceAutocomplete onPlaceSelect={setSelectedPlace} />
        </div>
      </APIProvider>

      {/* Features */}
      <div className="flex flex-col items-center">
        <h2>Sunset Score</h2>
        Nightfall provides location-based weekly sunset quality forecasts.
        Providing a holisttic score to easily visualize the quality of the
        sunset for the week in a single glance.
      </div>
      <div className="flex flex-col items-center">
        <h2>Global Predictions</h2>
        From Vancouver, Canada, to Sydney, Australia, Nightfall provides sunset
        quality forecasts for locations around the world.
      </div>
      <div className="flex flex-col items-center">
        <h2>For Photographers</h2>
        Lighting is a key factor in photography. Nightfall provides the golden
        hour duration as well as weather conditions to help photographers plan
        their shoots. So you can capture the perfect moment without worrying
        about getting wet.
      </div>
    </div>
  );
}
