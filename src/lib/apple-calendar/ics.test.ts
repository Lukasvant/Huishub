import { describe, expect, it } from "vitest";
import { parseAppleCalendarIcs } from "@/lib/apple-calendar/ics";

describe("parseAppleCalendarIcs", () => {
  it("leest Apple Kalender afspraken als bezette blokken", () => {
    const events = parseAppleCalendarIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Eten met vrienden
LOCATION:Thuis
DTSTART:20260619T180000Z
DTEND:20260619T210000Z
END:VEVENT
END:VCALENDAR`);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Eten met vrienden",
      location: "Thuis",
      allDay: false,
    });
    expect(events[0].start.toISOString()).toBe("2026-06-19T18:00:00.000Z");
    expect(events[0].end.toISOString()).toBe("2026-06-19T21:00:00.000Z");
  });

  it("maakt hele-dag afspraken tot een blok van datum tot datum", () => {
    const events = parseAppleCalendarIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:School dicht
DTSTART;VALUE=DATE:20260620
DTEND;VALUE=DATE:20260621
END:VEVENT
END:VCALENDAR`);

    expect(events).toHaveLength(1);
    expect(events[0].allDay).toBe(true);
    expect(events[0].start.getFullYear()).toBe(2026);
    expect(events[0].start.getMonth()).toBe(5);
    expect(events[0].start.getDate()).toBe(20);
    expect(events[0].end.getDate()).toBe(21);
  });

  it("slaat afgezegde en vrije events over", () => {
    const events = parseAppleCalendarIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Afgezegd
STATUS:CANCELLED
DTSTART:20260619T180000Z
DTEND:20260619T190000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Vrij blok
TRANSP:TRANSPARENT
DTSTART:20260620T180000Z
DTEND:20260620T190000Z
END:VEVENT
END:VCALENDAR`);

    expect(events).toEqual([]);
  });

  it("ondersteunt gevouwen regels en ontsnapte tekst", () => {
    const events = parseAppleCalendarIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Lang\\, gezellig
  diner
DTSTART:20260619T180000Z
DTEND:20260619T190000Z
END:VEVENT
END:VCALENDAR`);

    expect(events[0].title).toBe("Lang, gezellig diner");
  });
});
