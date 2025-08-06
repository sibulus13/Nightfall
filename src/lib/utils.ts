import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cache management utilities
export const getCacheStats = () => {
  // Access the cache from the global scope (if available)
  const cacheInfo = {
    message: "Cache stats available in browser console",
    timestamp: new Date().toISOString(),
  };

  // Log cache info to console for debugging
  console.log("Cache Stats:", cacheInfo);
  return cacheInfo;
};

// Helper to check if a location is cached
export const isLocationCached = (lat: number, lng: number, cachedLocations: string[]): boolean => {
  const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  return cachedLocations.includes(cacheKey);
};

// Debounce utility for API calls
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for API calls
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Helper to check if two coordinates are the same (with tolerance)
export const areCoordinatesEqual = (
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number },
  tolerance = 0.0001
): boolean => {
  return (
    Math.abs(coord1.lat - coord2.lat) < tolerance &&
    Math.abs(coord1.lng - coord2.lng) < tolerance
  );
};
