import { useDispatch } from "react-redux";
import { getSunsetPrediction } from "~/lib/sunset/sunset";

interface PredictionProps {
    lat: number;
    lon: number;
    onNavigate?: () => void;
}

export default function usePrediction() {
    const dispatch = useDispatch();

    const predict = async ({ lat, lon, onNavigate }: PredictionProps) => {
        localStorage.setItem("lat", lat.toString());
        localStorage.setItem("lon", lon.toString());
        const predictions = await getSunsetPrediction(lat, lon);
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

