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
    temperature_2m: number[];
    dew_point_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    precipitation_probability: number[];
    cape: number[]; // CAPE
    cin: number[]; // CIN
    uv_index: number[];
    uv_index_clear_sky: number[];
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
    aerosol_optical_depth: number[];
    aerosol_optical_depth_1020nm: number[];
    alder_pollen: number[];
    birch_pollen: number[];
    grass_pollen: number[];
    mugwort_pollen: number[];
    olive_pollen: number[];
    ragweed_pollen: number[];
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
    wind: number;
    temperature: number;
    stability: number;
    uv: number;
    aerosolOpticalDepth: number;
    europeanAQI: number;
    ozone: number;
    nitrogenDioxide: number;
  };
  cloud_cover: number;
  cloud_cover_low: number;
  cloud_cover_mid: number;
  cloud_cover_high: number;
  visibility: number;
  humidity: number;
  surface_pressure: number;
  temperature_2m: number;
  dew_point_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation_probability: number;
  cape: number;
  cin: number;
  uv_index: number;
  uv_index_clear_sky: number;
  pm10: number;
  pm2_5: number;
  european_aqi: number;
  aerosol_optical_depth: number;
  ozone: number;
  nitrogen_dioxide: number;
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
  temperature_2m: number;
  dew_point_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation_probability: number;
  cape: number;
  cin: number;
  uv_index: number;
  uv_index_clear_sky: number;
  pm10: number;
  pm2_5: number;
  european_aqi: number;
  aerosol_optical_depth: number;
  ozone: number;
  nitrogen_dioxide: number;
};
