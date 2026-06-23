export type WeatherLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

export type WeatherSnapshot = {
  locationLabel: string;
  temperatureC: number;
  apparentTemperatureC?: number;
  weatherCode?: number;
  description: string;
  windSpeedKmh?: number;
  precipitationMm?: number;
  precipitationProbabilityPercent?: number;
  dailyMinC?: number;
  dailyMaxC?: number;
  updatedAt: string;
};

type WeatherLocationConfig = {
  label?: string;
  latitude?: string;
  longitude?: string;
};

type OpenMeteoResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
  };
};

const FALLBACK_LOCATION: WeatherLocation = {
  label: "Amsterdam",
  latitude: 52.3676,
  longitude: 4.9041,
};

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export function getWeatherLocation(
  config: WeatherLocationConfig,
): WeatherLocation {
  const latitude = parseCoordinate(config.latitude);
  const longitude = parseCoordinate(config.longitude);

  if (latitude === undefined || longitude === undefined) {
    return FALLBACK_LOCATION;
  }

  return {
    label: config.label?.trim() || FALLBACK_LOCATION.label,
    latitude,
    longitude,
  };
}

export function getDefaultWeatherLocation(): WeatherLocation {
  return getWeatherLocation({
    label: process.env.NEXT_PUBLIC_DEFAULT_WEATHER_LABEL,
    latitude: process.env.NEXT_PUBLIC_DEFAULT_WEATHER_LAT,
    longitude: process.env.NEXT_PUBLIC_DEFAULT_WEATHER_LON,
  });
}

export function buildOpenMeteoForecastUrl(location: WeatherLocation): string {
  const url = new URL(OPEN_METEO_URL);

  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_min",
      "temperature_2m_max",
      "precipitation_probability_max",
    ].join(","),
  );
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "Europe/Amsterdam");
  url.searchParams.set("wind_speed_unit", "kmh");

  return url.toString();
}

export async function fetchWeatherSnapshot(
  location = getDefaultWeatherLocation(),
): Promise<WeatherSnapshot> {
  const response = await fetch(buildOpenMeteoForecastUrl(location), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Het weer kon niet worden opgehaald.");
  }

  const data = (await response.json()) as OpenMeteoResponse;
  return normalizeOpenMeteoResponse(data, location);
}

export function normalizeOpenMeteoResponse(
  data: OpenMeteoResponse,
  location: WeatherLocation,
): WeatherSnapshot {
  const current = data.current;

  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("De weerdata is onvolledig.");
  }

  return {
    locationLabel: location.label,
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature,
    weatherCode: current.weather_code,
    description: describeWeatherCode(current.weather_code),
    windSpeedKmh: current.wind_speed_10m,
    precipitationMm: current.precipitation,
    precipitationProbabilityPercent:
      data.daily?.precipitation_probability_max?.[0],
    dailyMinC: data.daily?.temperature_2m_min?.[0],
    dailyMaxC: data.daily?.temperature_2m_max?.[0],
    updatedAt: current.time ?? new Date().toISOString(),
  };
}

export function describeWeatherCode(code?: number): string {
  if (code === undefined) return "Weer onbekend";

  if (code === 0) return "Helder";
  if (code === 1) return "Overwegend helder";
  if (code === 2) return "Half bewolkt";
  if (code === 3) return "Bewolkt";
  if (code === 45 || code === 48) return "Mist";
  if ([51, 53, 55].includes(code)) return "Motregen";
  if ([56, 57].includes(code)) return "IJzelachtige motregen";
  if ([61, 63, 65].includes(code)) return "Regen";
  if ([66, 67].includes(code)) return "IJzel";
  if ([71, 73, 75, 77].includes(code)) return "Sneeuw";
  if ([80, 81, 82].includes(code)) return "Regenbuien";
  if ([85, 86].includes(code)) return "Sneeuwbuien";
  if (code === 95) return "Onweer";
  if (code === 96 || code === 99) return "Onweer met hagel";

  return "Weer onbekend";
}

function parseCoordinate(value?: string): number | undefined {
  if (!value) return undefined;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : undefined;
}
