import { GoCloudOffline } from "react-icons/go";
import {
  WiDaySunny,
  WiCloudy,
  WiFog,
  WiDayRain,
  WiDaySnow,
  WiDayThunderstorm,
  WiDayShowers,
  WiDaySleet,
} from "weather-icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export default function WeatherDisplay({
  weatherCode,
}: {
  weatherCode: number;
}) {
  const weather = getWeatherCondition(weatherCode);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{weather.icon}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{weather.text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getWeatherCondition(weatherCode: number, size = 48) {
  switch (weatherCode) {
    case 0:
      return { text: "Clear sky", icon: <WiDaySunny size={size} /> };
    case 1:
      return { text: "Mainly clear sky", icon: <WiDaySunny size={size} /> };
    case 2:
      return { text: "Partly cloudy", icon: <WiCloudy size={size} /> };
    case 3:
      return { text: "Mainly cloudy", icon: <WiCloudy size={size} /> };
    case 45:
      return { text: "Fog or ice fog", icon: <WiFog size={size} /> };
    case 48:
      return { text: "Depositing rime fog", icon: <WiFog size={size} /> };
    case 51:
      return { text: "Light drizzle", icon: <WiDayRain size={size} /> };
    case 53:
      return { text: "Moderate drizzle", icon: <WiDayRain size={size} /> };
    case 55:
      return { text: "Heavy drizzle", icon: <WiDayRain size={size} /> };
    case 56:
      return {
        text: "Light freezing drizzle",
        icon: <WiDaySleet size={size} />,
      };
    case 57:
      return {
        text: "Moderate or heavy freezing drizzle",
        icon: <WiDaySleet size={size} />,
      };
    case 61:
      return { text: "Light rain", icon: <WiDayRain size={size} /> };

    case 63:
      return { text: "Moderate rain", icon: <WiDayRain size={size} /> };

    case 65:
      return { text: "Heavy rain", icon: <WiDayRain size={size} /> };
    case 66:
      return { text: "Light freezing rain", icon: <WiDaySleet size={size} /> };
    case 67:
      return {
        text: "Moderate or heavy freezing rain",
        icon: <WiDaySleet size={size} />,
      };
    case 71:
    case 73:
    case 75:
      return { text: "Snow fall", icon: <WiDaySnow size={size} /> };
    case 77:
      return { text: "Snow grains", icon: <WiDaySnow size={size} /> };
    case 80:
    case 81:
    case 82:
      return { text: "Rain showers", icon: <WiDayShowers size={size} /> };
    case 85:
    case 86:
      return { text: "Snow showers", icon: <WiDaySnow size={size} /> };
    case 95:
      return { text: "Thunderstorm", icon: <WiDayThunderstorm size={size} /> };
    case 96:
    case 99:
      return {
        text: "Thunderstorm with hail",
        icon: <WiDayThunderstorm size={size} />,
      };
    default:
      return {
        text: "Unknown weather condition",
        icon: <GoCloudOffline size={size} />,
      };
  }
}
