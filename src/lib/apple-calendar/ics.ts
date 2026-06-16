import { addDays, addHours } from "date-fns";
import type { BusyBlock } from "@/lib/agenda/date-poll-planner";

export interface ImportedCalendarEvent extends BusyBlock {
  title?: string;
  location?: string;
  allDay: boolean;
}

interface ContentLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

function unfoldLines(input: string) {
  return input
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseContentLine(line: string): ContentLine | undefined {
  const separator = line.indexOf(":");
  if (separator === -1) return undefined;
  const nameAndParams = line.slice(0, separator);
  const value = line.slice(separator + 1);
  const [rawName, ...rawParams] = nameAndParams.split(";");
  const params = Object.fromEntries(
    rawParams
      .map((param) => {
        const [key, ...rest] = param.split("=");
        return [key.toUpperCase(), rest.join("=")];
      })
      .filter(([key]) => Boolean(key)),
  );

  return {
    name: rawName.toUpperCase(),
    params,
    value,
  };
}

function unescapeIcsText(value?: string) {
  return value
    ?.replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(
  value: string,
  params: Record<string, string> = {},
): { date: Date; allDay: boolean } | undefined {
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return {
      date: new Date(Number(year), Number(month) - 1, Number(day)),
      allDay: true,
    };
  }

  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(
    value,
  );
  if (!dateTime) return undefined;

  const [, year, month, day, hour, minute, second, utc] = dateTime;
  const parts = [
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ] as const;

  return {
    date:
      utc === "Z" || params.TZID === "UTC"
        ? new Date(Date.UTC(...parts))
        : new Date(...parts),
    allDay: false,
  };
}

function eventFromLines(
  lines: ContentLine[],
): ImportedCalendarEvent | undefined {
  const byName = new Map<string, ContentLine>();
  lines.forEach((line) => byName.set(line.name, line));

  if (byName.get("STATUS")?.value.toUpperCase() === "CANCELLED") {
    return undefined;
  }
  if (byName.get("TRANSP")?.value.toUpperCase() === "TRANSPARENT") {
    return undefined;
  }

  const startLine = byName.get("DTSTART");
  if (!startLine) return undefined;
  const start = parseIcsDate(startLine.value, startLine.params);
  if (!start) return undefined;

  const endLine = byName.get("DTEND");
  const end = endLine ? parseIcsDate(endLine.value, endLine.params) : undefined;

  return {
    start: start.date,
    end:
      end?.date ??
      (start.allDay ? addDays(start.date, 1) : addHours(start.date, 1)),
    title: unescapeIcsText(byName.get("SUMMARY")?.value),
    location: unescapeIcsText(byName.get("LOCATION")?.value),
    allDay: start.allDay,
  };
}

export function parseAppleCalendarIcs(input: string): ImportedCalendarEvent[] {
  const events: ImportedCalendarEvent[] = [];
  let currentEvent: ContentLine[] | undefined;

  for (const rawLine of unfoldLines(input)) {
    const line = parseContentLine(rawLine);
    if (!line) continue;

    if (line.name === "BEGIN" && line.value.toUpperCase() === "VEVENT") {
      currentEvent = [];
      continue;
    }
    if (line.name === "END" && line.value.toUpperCase() === "VEVENT") {
      if (currentEvent) {
        const event = eventFromLines(currentEvent);
        if (event && event.end > event.start) events.push(event);
      }
      currentEvent = undefined;
      continue;
    }

    currentEvent?.push(line);
  }

  return events;
}
