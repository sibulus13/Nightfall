"use client";
import React, { useEffect, useState, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { type PlaceAutocompleteProps } from "~/types/location";

export const PlaceAutocomplete = ({
  onPlaceSelect,
  value = "",
}: PlaceAutocompleteProps) => {
  const [placeAutocomplete, setPlaceAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary("places");

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ["formatted_address", "geometry", "name"],
      types: ["(cities)"],
    };

    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    placeAutocomplete.addListener("place_changed", () => {
      const place = placeAutocomplete.getPlace();
      onPlaceSelect(place);
      // Update input value when a place is selected
      if (place.formatted_address) {
        setInputValue(place.formatted_address.split(",")[0] ?? "");
      }
    });
  }, [onPlaceSelect, placeAutocomplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="min-w-0 flex-1 rounded-md border border-[#d7c1ad] bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-black/20">
      <input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search city"
        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
};
