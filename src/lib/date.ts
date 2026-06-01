import type { StoredDate } from "@/types/models";

export function asDate(value?: StoredDate): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

export function formatDay(value: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(value);
}

export function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function dateInputValue(value?: Date): string {
  if (!value) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export function dateTimeInputValue(value?: Date): string {
  if (!value) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
