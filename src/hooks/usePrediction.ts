import { useDispatch } from "react-redux";
import { getSunsetPrediction } from "~/lib/sunset/sunset";

interface PredictionProps {
    lat: number;
    lon: number;
    onNavigate?: () => void;
}

// Cache for main predictions
interface PredictionCache {
    [key: string]: {
        data: any[];
        timestamp: number;
        expiresAt: number;
    };
}

const predictionCache: PredictionCache = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Helper function to create cache key
const createCacheKey = (lat: number, lon: number) => `${lat.toFixed(4)}_${lon.toFixed(4)}`;

// Helper function to check if cache is valid
const isCacheValid = (cacheKey: string): boolean => {
    const cached = predictionCache[cacheKey];
    return !!(cached && Date.now() < cached.expiresAt);
};

export default function usePrediction() {
    const dispatch = useDispatch();

    const predict = async ({ lat, lon, onNavigate }: PredictionProps) => {
        const cacheKey = createCacheKey(lat, lon);

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

