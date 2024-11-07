
export interface Place {
    geometry: {
        location: {
            lat: () => number;
            lng: () => number;
        };
    };
}

export interface Location {
    location: {
        lat: number;
        lon: number;
        name: string;
    };
}

export interface PlaceAutocompleteProps {
    onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
  }
  