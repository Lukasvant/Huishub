"use client";

import { CloudSun, Droplets, MapPin, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import {
  fetchWeatherSnapshot,
  getDefaultWeatherLocation,
  type WeatherSnapshot,
} from "@/lib/weather/open-meteo";

const DUTCH_TIME_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  hour: "2-digit",
  minute: "2-digit",
});

const DUTCH_DATE_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function WeatherTimeCard() {
  const location = useMemo(() => getDefaultWeatherLocation(), []);
  const [now, setNow] = useState<Date>();
  const [weather, setWeather] = useState<WeatherSnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    function tick() {
      setNow(new Date());
    }

    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadWeather() {
      setLoading(true);
      setError(undefined);

      try {
        const snapshot = await fetchWeatherSnapshot(location);
        if (mounted) setWeather(snapshot);
      } catch {
        if (mounted) {
          setError("Het weer is nu niet beschikbaar.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadWeather();

    return () => {
      mounted = false;
    };
  }, [location]);

  return (
    <Card className="relative overflow-hidden bg-cyan-50/70">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-200/60 blur-2xl"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-cyan-700">Nu thuis</p>
            <p className="mt-2 text-5xl leading-none">
              {now ? DUTCH_TIME_FORMATTER.format(now) : "--:--"}
            </p>
            <p className="mt-1 text-sm capitalize text-muted">
              {now ? DUTCH_DATE_FORMATTER.format(now) : "Vandaag"}
            </p>
          </div>
          <div className="rounded-full border border-cyan-200 bg-white/70 p-3 text-cyan-700">
            <CloudSun className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-cyan-100 bg-white/65 p-3">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted">
            <MapPin className="h-3.5 w-3.5" />
            {location.label}
          </div>

          {loading && <p className="mt-3 text-sm text-muted">Weer laden...</p>}

          {!loading && error && (
            <p className="mt-3 text-sm text-red-700">{error}</p>
          )}

          {!loading && weather && (
            <>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-4xl font-semibold">
                    {Math.round(weather.temperatureC)}°
                  </p>
                  <p className="text-sm text-muted">{weather.description}</p>
                </div>
                {weather.dailyMinC !== undefined &&
                  weather.dailyMaxC !== undefined && (
                    <p className="text-right text-sm text-muted">
                      {Math.round(weather.dailyMinC)}° /{" "}
                      {Math.round(weather.dailyMaxC)}°
                    </p>
                  )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                <WeatherDetail
                  icon={<Droplets className="h-4 w-4 text-cyan-700" />}
                  label="Regen"
                  value={formatRain(weather)}
                />
                <WeatherDetail
                  icon={<Wind className="h-4 w-4 text-cyan-700" />}
                  label="Wind"
                  value={
                    weather.windSpeedKmh === undefined
                      ? "-"
                      : `${Math.round(weather.windSpeedKmh)} km/u`
                  }
                />
              </div>
            </>
          )}
        </div>

        <a
          className="mt-3 inline-flex text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
          href="https://open-meteo.com/"
          rel="noreferrer"
          target="_blank"
        >
          Weer via Open-Meteo
        </a>
      </div>
    </Card>
  );
}

function WeatherDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-cyan-50/80 p-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function formatRain(weather: WeatherSnapshot): string {
  if (weather.precipitationProbabilityPercent !== undefined) {
    return `${Math.round(weather.precipitationProbabilityPercent)}% kans`;
  }

  if (weather.precipitationMm !== undefined) {
    return `${weather.precipitationMm.toFixed(1)} mm`;
  }

  return "-";
}
