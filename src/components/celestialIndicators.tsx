/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import React, { useMemo, useRef, useEffect, useState } from "react";
import * as SunCalc from "suncalc";
import { Sun, Moon } from "lucide-react";

interface CelestialIndicatorsProps {
  center: { lat: number; lng: number };
  selectedDate: string;
  sunsetTime?: string;
}

interface CelestialPosition {
  azimuth: number; // in degrees
  altitude: number; // in degrees
  distance?: number; // for moon, in km
}

const CelestialIndicators: React.FC<CelestialIndicatorsProps> = ({
  center,
  selectedDate,
  sunsetTime,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportDimensions, setViewportDimensions] = useState({
    width: 400,
    height: 400,
  });

  // Get actual viewport dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewportDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const celestialPositions = useMemo((): {
    sun: CelestialPosition | null;
    moon: CelestialPosition | null;
  } => {
    if (!center || !selectedDate) {
      return { sun: null, moon: null };
    }

    try {
      // Parse the selected date and sunset time
      const date = new Date(selectedDate);
      let targetTime = date;

      // If we have a sunset time, use it; otherwise use noon for the selected date
      if (sunsetTime) {
        const sunsetDate = new Date(sunsetTime);
        // Combine the selected date with the sunset time
        targetTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          sunsetDate.getHours(),
          sunsetDate.getMinutes(),
          sunsetDate.getSeconds(),
        );
      } else {
        // Default to sunset time for the selected date
        const times = SunCalc.getTimes(date, center.lat, center.lng);
        targetTime = times.sunset;
      }

      // Calculate sun position
      const sunPosition = SunCalc.getPosition(
        targetTime,
        center.lat,
        center.lng,
      );
      // Convert SunCalc azimuth to standard compass bearing
      // SunCalc: 0°=South, 90°=West, 180°=North, 270°=East (from south, clockwise)
      // Standard: 0°=North, 90°=East, 180°=South, 270°=West (from north, clockwise)
      const sunCalcAzimuth = (sunPosition.azimuth * 180) / Math.PI; // Convert to degrees
      const compassAzimuth = (sunCalcAzimuth + 180) % 360; // Convert from south-based to north-based

      const sun: CelestialPosition = {
        azimuth: compassAzimuth,
        altitude: (sunPosition.altitude * 180) / Math.PI, // Convert to degrees
      };

      // Calculate moon position
      const moonPosition = SunCalc.getMoonPosition(
        targetTime,
        center.lat,
        center.lng,
      );

      // Convert SunCalc azimuth to standard compass bearing for moon
      const moonCalcAzimuth = (moonPosition.azimuth * 180) / Math.PI; // Convert to degrees
      const moonCompassAzimuth = (moonCalcAzimuth + 180) % 360; // Convert from south-based to north-based

      const moon: CelestialPosition = {
        azimuth: moonCompassAzimuth,
        altitude: (moonPosition.altitude * 180) / Math.PI, // Convert to degrees
        distance: moonPosition.distance,
      };

      return { sun, moon };
    } catch (error) {
      console.error("Error calculating celestial positions:", error);
      return { sun: null, moon: null };
    }
  }, [center, selectedDate, sunsetTime]);

  // Calculate a point far outside viewport based on azimuth
  const getDistantPoint = (azimuth: number) => {
    const { width, height } = viewportDimensions;

    // Convert azimuth to radians
    // SunCalc: 0° = South, 90° = West, 180° = North, 270° = East
    // Screen: 0° = East, 90° = South, 180° = West, 270° = North
    const azimuthRad = (azimuth * Math.PI) / 180;

    // Calculate a point very far away in the direction of the azimuth
    // Use a large distance to ensure it's outside any reasonable viewport
    const farDistance = Math.max(width, height) * 2;

    // Calculate the distant point coordinates
    const distantX = Math.sin(azimuthRad) * farDistance;
    const distantY = -Math.cos(azimuthRad) * farDistance; // Negative because screen Y is inverted

    return { x: distantX, y: distantY };
  };

  // Calculate where the line from center to distant point intersects the viewport edge
  const getEdgeIntersection = (azimuth: number) => {
    const { width, height } = viewportDimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const distantPoint = getDistantPoint(azimuth);

    // Calculate the line from center to distant point
    const dx = distantPoint.x;
    const dy = distantPoint.y;

    // Find intersection with viewport edges
    // Check intersection with each edge and find the closest one
    const intersections = [];

    // Top edge (y = 0)
    if (dy !== 0) {
      const t = -centerY / dy;
      if (t > 0) {
        const x = centerX + t * dx;
        if (x >= 0 && x <= width) {
          intersections.push({ x, y: 0, t });
        }
      }
    }

    // Bottom edge (y = height)
    if (dy !== 0) {
      const t = (height - centerY) / dy;
      if (t > 0) {
        const x = centerX + t * dx;
        if (x >= 0 && x <= width) {
          intersections.push({ x, y: height, t });
        }
      }
    }

    // Left edge (x = 0)
    if (dx !== 0) {
      const t = -centerX / dx;
      if (t > 0) {
        const y = centerY + t * dy;
        if (y >= 0 && y <= height) {
          intersections.push({ x: 0, y, t });
        }
      }
    }

    // Right edge (x = width)
    if (dx !== 0) {
      const t = (width - centerX) / dx;
      if (t > 0) {
        const y = centerY + t * dy;
        if (y >= 0 && y <= height) {
          intersections.push({ x: width, y, t });
        }
      }
    }

    // Find the intersection with the smallest t (closest to center)
    if (intersections.length === 0) {
      console.warn("No intersection found, using center");
      return { x: 0, y: 0 };
    }

    const closestIntersection = intersections.reduce((closest, current) =>
      current.t < closest.t ? current : closest,
    );

    // Convert to relative coordinates from center
    const relativeX = closestIntersection.x - centerX;
    const relativeY = closestIntersection.y - centerY;

    return { x: relativeX, y: relativeY };
  };

  // Calculate line length based on altitude (how far from edge toward center)
  const getLineLength = (altitude: number) => {
    // Use altitude to determine how far the line extends from the edge toward center
    // Higher altitude = line extends further toward center
    const maxLength = 0.7; // Maximum line length as fraction of edge distance
    const minLength = 0.2; // Minimum line length as fraction of edge distance

    // Clamp altitude to 0-90 and map to line length
    const normalizedAltitude = Math.max(0, Math.min(90, altitude)) / 90;
    const length = minLength + (maxLength - minLength) * normalizedAltitude;

    return length;
  };

  if (!celestialPositions.sun && !celestialPositions.moon) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10"
    >
      {/* SVG for drawing lines */}
      <svg className="absolute inset-0 z-10 h-full w-full">
        {/* Center indicator (X mark with circle) */}
        {(() => {
          const centerX = viewportDimensions.width / 2;
          const centerY = viewportDimensions.height / 2;
          const crossSize = 12; // Size of the X mark
          const circleRadius = 18; // Radius of the outer circle

          return (
            <>
              {/* Outer circle */}
              <circle
                cx={centerX}
                cy={centerY}
                r={circleRadius}
                fill="none"
                stroke="rgba(239, 68, 68, 0.6)"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
              {/* Center X mark */}
              <line
                x1={centerX - crossSize}
                y1={centerY - crossSize}
                x2={centerX + crossSize}
                y2={centerY + crossSize}
                stroke="rgba(239, 68, 68, 0.8)"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
              <line
                x1={centerX + crossSize}
                y1={centerY - crossSize}
                x2={centerX - crossSize}
                y2={centerY + crossSize}
                stroke="rgba(239, 68, 68, 0.8)"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
              {/* Center dot */}
              <circle
                cx={centerX}
                cy={centerY}
                r="3"
                fill="rgba(239, 68, 68, 0.9)"
                className="drop-shadow-sm"
              />
            </>
          );
        })()}
        {/* Sun line */}
        {celestialPositions.sun &&
          celestialPositions.sun.altitude > -6 &&
          (() => {
            const centerX = viewportDimensions.width / 2;
            const centerY = viewportDimensions.height / 2;
            const distantPoint = getDistantPoint(
              celestialPositions.sun.azimuth,
            );
            const lineLength = getLineLength(celestialPositions.sun.altitude);

            // Line starts at center and goes toward distant point
            const startX = centerX;
            const startY = centerY;
            const endX = centerX + distantPoint.x * lineLength;
            const endY = centerY + distantPoint.y * lineLength;

            return (
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="rgba(251, 191, 36, 0.8)"
                strokeWidth="3"
                strokeDasharray="5,5"
                className="drop-shadow-sm"
              />
            );
          })()}

        {/* Moon line */}
        {celestialPositions.moon &&
          celestialPositions.moon.altitude > -6 &&
          (() => {
            const centerX = viewportDimensions.width / 2;
            const centerY = viewportDimensions.height / 2;
            const distantPoint = getDistantPoint(
              celestialPositions.moon.azimuth,
            );
            const lineLength = getLineLength(celestialPositions.moon.altitude);

            // Line starts at center and goes toward distant point
            const startX = centerX;
            const startY = centerY;
            const endX = centerX + distantPoint.x * lineLength;
            const endY = centerY + distantPoint.y * lineLength;

            return (
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="rgba(156, 163, 175, 0.8)"
                strokeWidth="3"
                strokeDasharray="3,3"
                className="drop-shadow-sm"
              />
            );
          })()}
      </svg>

      {/* Sun indicator at edge */}
      {celestialPositions.sun && celestialPositions.sun.altitude > -6 && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transform"
          style={{
            left: `${viewportDimensions.width / 2 + getEdgeIntersection(celestialPositions.sun.azimuth).x}px`,
            top: `${viewportDimensions.height / 2 + getEdgeIntersection(celestialPositions.sun.azimuth).y}px`,
          }}
        >
          <div className="relative">
            <Sun
              className="h-6 w-6 text-yellow-500 drop-shadow-lg"
              style={{
                filter: `drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))`,
              }}
            />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 transform whitespace-nowrap rounded bg-white/90 px-2 py-1 text-xs font-medium text-yellow-600 shadow-sm">
              Sun {Math.round(celestialPositions.sun.altitude)}°
            </div>
          </div>
        </div>
      )}

      {/* Moon indicator at edge */}
      {celestialPositions.moon && celestialPositions.moon.altitude > -6 && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transform"
          style={{
            left: `${viewportDimensions.width / 2 + getEdgeIntersection(celestialPositions.moon.azimuth).x}px`,
            top: `${viewportDimensions.height / 2 + getEdgeIntersection(celestialPositions.moon.azimuth).y}px`,
          }}
        >
          <div className="relative">
            <Moon
              className="h-5 w-5 text-gray-400 drop-shadow-lg"
              style={{
                filter: `drop-shadow(0 0 6px rgba(156, 163, 175, 0.6))`,
              }}
            />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 transform whitespace-nowrap rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-500 shadow-sm">
              Moon {Math.round(celestialPositions.moon.altitude)}°
            </div>
          </div>
        </div>
      )}

      {/* Compass rose for reference */}
      <div className="absolute bottom-4 right-4 rounded-lg bg-white/90 p-2 shadow-lg">
        <div className="mb-1 text-xs font-medium text-gray-700">Compass</div>
        <div className="relative h-16 w-16">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 transform text-xs text-gray-600">
            N
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 transform text-xs text-gray-600">
            S
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 transform text-xs text-gray-600">
            W
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 transform text-xs text-gray-600">
            E
          </div>
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gray-400"></div>
        </div>
      </div>
    </div>
  );
};

export default CelestialIndicators;
