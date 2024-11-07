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
    weather_code: number[];
  };
};

export type Prediction = {
  score: number;
  golden_hour: {
    start: string;
    end: string;
  };
  weather_code: number;
  sunset_time: string;
};

export type PredictionData = {
  golden_hour: {
    start: string;
    end: string;
  };
  daylight_duration: number;
  sunset_start_hourly_index: number;
  sunset_end_hourly_index: number;
  sunset_window: {
    start: string;
    end: string;
  };
  sunset: string;
  cloud_cover: number;
  cloud_cover_low: number;
  visibility: number;
  humidity: number;
  weather_code: number;
};
