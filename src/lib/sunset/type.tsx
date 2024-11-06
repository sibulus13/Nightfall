export type Coordinates = { latitude: number; longitude: number } | null;

export type WeatherForecast = {
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
    daylight_duration: number[];
    sunshine_duration: number[];
  };
  hourly: {
    time: string[];
    relative_humidity_2m: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    visibility: number[];
  };
};

export type Prediction = {
  score: {};
  golden_hour: {
    start: string;
    end: string;
  };
  weather_code: number;
  sunset: string;
};
