import { describe, expect, it } from "vitest";
import {
  buildOpenMeteoForecastUrl,
  describeWeatherCode,
  getWeatherLocation,
  normalizeOpenMeteoResponse,
} from "./open-meteo";

describe("Open-Meteo weather helpers", () => {
  it("uses a configured location when coordinates are valid", () => {
    expect(
      getWeatherLocation({
        label: "Thuis",
        latitude: "52.1",
        longitude: "5.1",
      }),
    ).toEqual({
      label: "Thuis",
      latitude: 52.1,
      longitude: 5.1,
    });
  });

  it("falls back to Amsterdam when coordinates are missing", () => {
    expect(getWeatherLocation({ label: "Thuis" })).toEqual({
      label: "Amsterdam",
      latitude: 52.3676,
      longitude: 4.9041,
    });
  });

  it("builds a compact forecast URL for current dashboard weather", () => {
    const url = new URL(
      buildOpenMeteoForecastUrl({
        label: "Thuis",
        latitude: 52.1,
        longitude: 5.1,
      }),
    );

    expect(url.origin + url.pathname).toBe(
      "https://api.open-meteo.com/v1/forecast",
    );
    expect(url.searchParams.get("latitude")).toBe("52.1");
    expect(url.searchParams.get("longitude")).toBe("5.1");
    expect(url.searchParams.get("timezone")).toBe("Europe/Amsterdam");
    expect(url.searchParams.get("forecast_days")).toBe("1");
    expect(url.searchParams.get("current")).toContain("temperature_2m");
    expect(url.searchParams.get("daily")).toContain(
      "precipitation_probability_max",
    );
  });

  it("describes common WMO weather codes in Dutch", () => {
    expect(describeWeatherCode(0)).toBe("Helder");
    expect(describeWeatherCode(61)).toBe("Regen");
    expect(describeWeatherCode(95)).toBe("Onweer");
    expect(describeWeatherCode(999)).toBe("Weer onbekend");
  });

  it("normalizes Open-Meteo response data for the dashboard", () => {
    expect(
      normalizeOpenMeteoResponse(
        {
          current: {
            time: "2026-06-23T14:00",
            temperature_2m: 20.4,
            apparent_temperature: 19.9,
            precipitation: 0,
            weather_code: 2,
            wind_speed_10m: 13.2,
          },
          daily: {
            temperature_2m_min: [14],
            temperature_2m_max: [23],
            precipitation_probability_max: [30],
          },
        },
        { label: "Thuis", latitude: 52.1, longitude: 5.1 },
      ),
    ).toEqual({
      locationLabel: "Thuis",
      temperatureC: 20.4,
      apparentTemperatureC: 19.9,
      weatherCode: 2,
      description: "Half bewolkt",
      windSpeedKmh: 13.2,
      precipitationMm: 0,
      precipitationProbabilityPercent: 30,
      dailyMinC: 14,
      dailyMaxC: 23,
      updatedAt: "2026-06-23T14:00",
    });
  });
});
