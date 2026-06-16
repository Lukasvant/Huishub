import { describe, expect, it } from "vitest";
import { suggestDatePollSlots } from "@/lib/agenda/date-poll-planner";
import type { AgendaItem } from "@/types/models";

describe("suggestDatePollSlots", () => {
  it("stelt vrije tijdvakken voor binnen de gekozen uren", () => {
    const slots = suggestDatePollSlots({
      rangeStart: new Date("2026-06-18T16:00:00.000Z"),
      rangeEnd: new Date("2026-06-18T22:00:00.000Z"),
      durationMinutes: 120,
      allowedStartHour: 18,
      allowedEndHour: 22,
      maxSuggestions: 3,
    });

    expect(slots.map((slot) => slot.startDateTime.toISOString())).toEqual([
      "2026-06-18T18:00:00.000Z",
      "2026-06-18T18:30:00.000Z",
      "2026-06-18T19:00:00.000Z",
    ]);
  });

  it("filtert Google freebusy-blokken en lokale TaskHive-afspraken weg", () => {
    const localAgendaItem = {
      id: "taskhive-agenda",
      householdId: "home",
      title: "Lokale afspraak",
      startDateTime: new Date("2026-06-18T20:00:00.000Z"),
      endDateTime: new Date("2026-06-18T21:00:00.000Z"),
      allDay: false,
      private: false,
      visibleToViewers: true,
      createdBy: "user",
      source: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies AgendaItem;

    const slots = suggestDatePollSlots({
      rangeStart: new Date("2026-06-18T18:00:00.000Z"),
      rangeEnd: new Date("2026-06-18T22:00:00.000Z"),
      durationMinutes: 60,
      allowedStartHour: 18,
      allowedEndHour: 22,
      busyBlocks: [
        {
          start: new Date("2026-06-18T18:30:00.000Z"),
          end: new Date("2026-06-18T19:30:00.000Z"),
        },
      ],
      agendaItems: [localAgendaItem],
    });

    expect(slots.map((slot) => slot.startDateTime.toISOString())).toEqual([
      "2026-06-18T21:00:00.000Z",
    ]);
  });

  it("respecteert weekdagen, stapgrootte en maximum aantal suggesties", () => {
    const slots = suggestDatePollSlots({
      rangeStart: new Date("2026-06-20T08:00:00.000Z"),
      rangeEnd: new Date("2026-06-21T22:00:00.000Z"),
      durationMinutes: 90,
      stepMinutes: 60,
      allowedWeekdays: [0],
      allowedStartHour: 10,
      allowedEndHour: 16,
      maxSuggestions: 2,
    });

    expect(slots.map((slot) => slot.startDateTime.toISOString())).toEqual([
      "2026-06-21T10:00:00.000Z",
      "2026-06-21T11:00:00.000Z",
    ]);
  });
});
