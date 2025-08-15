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
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    surface_pressure: number[];
    weather_code: number[];
  };
};

export type AirQualityForecast = {
  hourly: {
    time: string[];
    pm10: number[];
    pm2_5: number[];
    carbon_monoxide: number[];
    nitrogen_dioxide: number[];
    sulphur_dioxide: number[];
    ozone: number[];
    dust: number[];
    uv_index: number[];
    uv_index_clear_sky: number[];
    european_aqi: number[];
    european_aqi_pm2_5: number[];
    european_aqi_pm10: number[];
    european_aqi_nitrogen_dioxide: number[];
    european_aqi_ozone: number[];
    european_aqi_sulphur_dioxide: number[];
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
  scores: {
    score: number;
    cloudCoverage: number;
    visibility: number;
    humidity: number;
    pressure: number;
    particulate: number;
  };
  // Detailed weather information
  cloud_cover: number;
  cloud_cover_low: number;
  cloud_cover_mid: number;
  cloud_cover_high: number;
  visibility: number;
  humidity: number;
  surface_pressure: number;
  // Air quality data
  pm10: number;
  pm2_5: number;
  european_aqi: number;
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
  cloud_cover_mid: number;
  cloud_cover_high: number;
  visibility: number;
  humidity: number;
  surface_pressure: number;
  weather_code: number;
  // Air quality data
  pm10: number;
  pm2_5: number;
  european_aqi: number;
};
