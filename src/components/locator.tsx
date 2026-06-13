import { PlaceAutocomplete } from "~/components/autoComplete";
import { APIProvider } from "@vis.gl/react-google-maps";
import { FaLocationCrosshairs } from "react-icons/fa6";

interface LocatorProps {
  setSelectedPlace: (place: google.maps.places.PlaceResult | null) => void;
  handleLocationClick: () => void;
  value?: string;
}

export default function Locator({
  setSelectedPlace,
  handleLocationClick,
  value = "",
}: LocatorProps) {
  const API_KEY: string = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="flex gap-2">
        <PlaceAutocomplete onPlaceSelect={setSelectedPlace} value={value} />
        <button
          type="button"
          onClick={handleLocationClick}
          className="nf-icon-button h-10 w-10 shrink-0"
          aria-label="Use current location"
          title="Use current location"
        >
          <FaLocationCrosshairs className="h-4 w-4" />
        </button>
      </div>
    </APIProvider>
  );
}
