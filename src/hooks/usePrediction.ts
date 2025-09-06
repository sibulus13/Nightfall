import { useDispatch } from "react-redux";
import { getSunsetPrediction } from "~/lib/sunset/sunset";
import type { Prediction } from "~/lib/sunset/type";

interface PredictionProps {
    lat: number;
    lon: number;
    onNavigate?: () => void;
}

// Cache for main predictions
type PredictionCache = Record<string, {
    data: Prediction[];
    timestamp: number;
    expiresAt: number;
}>

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = "sunset-app-predictions-cache";

// Helper functions for localStorage
const saveToLocalStorage = (key: string, data: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }
};

const loadFromLocalStorage = (key: string): unknown => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("Error loading from localStorage:", error);
        return null;
    }
};

// Load cache from localStorage on initialization
const loadCacheFromStorage = (): PredictionCache => {
    if (typeof window === "undefined") return {};

    const cached = loadFromLocalStorage(CACHE_KEY) as PredictionCache;
    if (!cached) return {};

    // Filter out expired entries
    const now = Date.now();
    const validCache: PredictionCache = {};

    Object.entries(cached).forEach(([key, value]) => {
        if (value.expiresAt > now) {
            validCache[key] = value;
        }
    });

    return validCache;
};

const predictionCache: PredictionCache = loadCacheFromStorage();

// Helper function to create cache key
const createCacheKey = (lat: number, lon: number) => `${lat.toFixed(4)}_${lon.toFixed(4)}`;

// Helper function to check if cache is valid
const isCacheValid = (cacheKey: string): boolean => {
    const cached = predictionCache[cacheKey];
    return !!(cached && Date.now() < cached.expiresAt);
};

// Helper function to clean up expired cache entries
const cleanupExpiredCache = () => {
    const now = Date.now();
    let hasExpiredEntries = false;

    Object.keys(predictionCache).forEach(key => {
        const entry = predictionCache[key];
        if (entry && entry.expiresAt <= now) {
            delete predictionCache[key];
            hasExpiredEntries = true;
        }
    });

    // Save cleaned cache to localStorage if we removed anything
    if (hasExpiredEntries) {
        saveToLocalStorage(CACHE_KEY, predictionCache);
    }
};

export default function usePrediction() {
    const dispatch = useDispatch();

    const predict = async ({ lat, lon, onNavigate }: PredictionProps) => {
        const cacheKey = createCacheKey(lat, lon);

        // Clean up expired cache entries periodically
        cleanupExpiredCache();

        // Check cache first
        if (isCacheValid(cacheKey)) {
            const cachedData = predictionCache[cacheKey]?.data;
            if (cachedData) {
                localStorage.setItem("lat", lat.toString());
                localStorage.setItem("lon", lon.toString());
                dispatch({
                    type: "prediction/setPrediction",
                    payload: cachedData,
                });
                if (onNavigate) {
                    onNavigate();
                }
                return;
            }
        }

        // Fetch new data if not cached
        localStorage.setItem("lat", lat.toString());
        localStorage.setItem("lon", lon.toString());
        const predictions = await getSunsetPrediction(lat, lon);

        // Cache the results
        if (predictions) {
            predictionCache[cacheKey] = {
                data: predictions,
                timestamp: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION,
            };

            // Save updated cache to localStorage
            saveToLocalStorage(CACHE_KEY, predictionCache);
        }

        dispatch({
            type: "prediction/setPrediction",
            payload: predictions,
        });
        if (onNavigate) {
            onNavigate();
        }
    };

    return { predict };
};

