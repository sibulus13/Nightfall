import { PlaceAutocomplete } from "~/components/autoComplete";
import { APIProvider } from "@vis.gl/react-google-maps";
import { FaLocationCrosshairs } from "react-icons/fa6";

export default function Locator({ setSelectedPlace, handleLocationClick }) {
  const API_KEY: string = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="flex gap-2">
        <PlaceAutocomplete onPlaceSelect={setSelectedPlace} />
        <button onClick={handleLocationClick}>
          <FaLocationCrosshairs className="h-10 w-10" />
        </button>
      </div>
    </APIProvider>
  );
}
