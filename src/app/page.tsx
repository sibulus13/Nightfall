"use client";
import React, { useEffect, useState, useRef } from "react";
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
      const lat = selectedPlace.geometry?.location.lat();
      const lng = selectedPlace.geometry?.location.lng();
      Router.push("/App" + "?lat=" + lat + "&lng=" + lng);
    }
  }, [selectedPlace, Router]);

  // const [selectedPlace, setSelectedPlace] =
  //   useState<google.maps.places.PlaceResult | null>(null);

  // const Router = useRouter();

  // useEffect(() => {
  //   if (selectedPlace) {
  //     // console.log(selectedPlace.geometry?.location.lat());
  //     // console.log(selectedPlace.geometry?.location.lng());

  //     Router.push("/App", {
  //       query: {
  //         lat: selectedPlace.geometry?.location.lat(),
  //         lng: selectedPlace.geometry?.location.lng(),
  //       },
  //     });
  //   }
  // }, [selectedPlace]);

  return (
    <div className="flex-col">
      <h1>Weekly Sunset Quality Forecast</h1>
      <br></br>
      <APIProvider
        apiKey={API_KEY}
        // solutionChannel="GMP_devsite_samples_v3_rgmautocomplete"
      >
        <div className="autocomplete-control">
          <PlaceAutocomplete onPlaceSelect={setSelectedPlace} />
        </div>
      </APIProvider>
    </div>
  );
}
