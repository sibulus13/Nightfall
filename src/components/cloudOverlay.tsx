import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

const DEFAULT_CLOUD_OPACITY = 0.6;
const TILE_SIZE_PX = 256;

interface CloudOverlayProps {
  /** Whether the cloud tile layer should be shown. */
  visible: boolean;
  /** Tile opacity (0-1). Defaults to 0.6. */
  opacity?: number;
  /** Unix seconds for sunset timing; forwarded to the OWM forecast tiles. */
  date?: number;
}

/**
 * Imperative Google Maps overlay that pushes an OpenWeatherMap cloud
 * `ImageMapType` onto the map's `overlayMapTypes`. Rendered as a child of
 * `<Map>` so `useMap()` resolves the map instance. Renders nothing itself.
 */
const CloudOverlay: React.FC<CloudOverlayProps> = ({
  visible,
  opacity = DEFAULT_CLOUD_OPACITY,
  date,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !visible) {
      return;
    }

    const dateParam =
      date !== undefined ? `?date=${Math.floor(date)}` : "";

    const cloudLayer = new google.maps.ImageMapType({
      name: "clouds",
      tileSize: new google.maps.Size(TILE_SIZE_PX, TILE_SIZE_PX),
      opacity,
      getTileUrl: (coord: google.maps.Point, zoom: number) =>
        `/api/tiles/clouds/${zoom}/${coord.x}/${coord.y}${dateParam}`,
    });

    map.overlayMapTypes.push(cloudLayer);
    const layerIndex = map.overlayMapTypes.getLength() - 1;

    return () => {
      // Remove exactly the layer we pushed (guard against reordering).
      if (map.overlayMapTypes.getAt(layerIndex) === cloudLayer) {
        map.overlayMapTypes.removeAt(layerIndex);
      }
    };
  }, [map, visible, opacity, date]);

  return null;
};

export default CloudOverlay;
